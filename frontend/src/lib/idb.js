// IndexedDB 래퍼 - 여러 개의 명명된 가상 시간표를 브라우저에 영속 저장한다.
// 교수님 강의 inuDB 패턴(open/onupgradeneeded/transaction)을 따른다.
// Web Storage 활용 요건 충족(DBMS와 병행).
//
// 모델: timetables 스토어(각 시간표 = {id, name, year, term, courses[], createdAt})
//       app 스토어(활성 시간표 id 등 메타)
// 기존 단일-시간표 API(getTimetable/addCourseToTimetable/...)는 "활성 시간표"에 대해 동작하도록 유지한다.

const DB_NAME = "inucm-idb";
const DB_VERSION = 2;
const TT = "timetables"; // keyPath: id (autoIncrement)
const APP = "app"; // keyPath: key
const OLD = "timetable"; // v1 단일 스토어 (마이그레이션용으로 유지)

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TT)) db.createObjectStore(TT, { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains(APP)) db.createObjectStore(APP, { keyPath: "key" });
      // 기존 v1 'timetable' 스토어는 삭제하지 않고 남겨 마이그레이션에 사용
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// --- 저수준 헬퍼 (db를 인자로 받음) ---
function getAll(db, store) {
  return new Promise((res) => {
    if (!db.objectStoreNames.contains(store)) return res([]);
    const r = db.transaction(store, "readonly").objectStore(store).getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => res([]);
  });
}
function getOne(db, store, key) {
  return new Promise((res) => {
    const r = db.transaction(store, "readonly").objectStore(store).get(key);
    r.onsuccess = () => res(r.result ?? null);
    r.onerror = () => res(null);
  });
}
function putApp(db, key, value) {
  return new Promise((res, rej) => {
    const t = db.transaction(APP, "readwrite");
    t.objectStore(APP).put({ key, value });
    t.oncomplete = () => res();
    t.onerror = (e) => rej(e.target.error);
  });
}
function putTT(db, rec) {
  return new Promise((res, rej) => {
    const t = db.transaction(TT, "readwrite");
    t.objectStore(TT).put(rec);
    t.oncomplete = () => res();
    t.onerror = (e) => rej(e.target.error);
  });
}
function addTT(db, rec) {
  return new Promise((res, rej) => {
    const t = db.transaction(TT, "readwrite");
    const rq = t.objectStore(TT).add(rec);
    rq.onsuccess = () => res(rq.result);
    t.onerror = (e) => rej(e.target.error);
  });
}

function sortByCreated(list) {
  return [...list].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

// 활성 시간표 보장: 없으면 기본 생성(+ v1 데이터 1회 마이그레이션)
async function ensureActive(db) {
  const activeId = await getOne(db, APP, "activeId");
  if (activeId?.value != null) {
    const rec = await getOne(db, TT, activeId.value);
    if (rec) return rec;
  }
  const all = sortByCreated(await getAll(db, TT));
  if (all.length) {
    await putApp(db, "activeId", all[0].id);
    return all[0];
  }
  // 아무 시간표도 없음 → 기본 생성 (+ 기존 v1 단일 시간표 강의 이관)
  const oldCourses = (await getAll(db, OLD)).map((x) => x.course).filter(Boolean);
  const rec = { name: "내 시간표", year: 2026, term: "1학기", courses: oldCourses, createdAt: Date.now() };
  const id = await addTT(db, rec);
  rec.id = id;
  await putApp(db, "activeId", id);
  return rec;
}

// --- 활성 시간표 기준 API (기존 호출부 호환) ---
export async function getTimetable() {
  const db = await openDB();
  const rec = await ensureActive(db);
  return rec.courses || [];
}
export async function addCourseToTimetable(course) {
  const db = await openDB();
  const rec = await ensureActive(db);
  if (!rec.courses.some((c) => c.id === course.id)) rec.courses.push(course);
  await putTT(db, rec);
  return true;
}
export async function removeCourseFromTimetable(courseId) {
  const db = await openDB();
  const rec = await ensureActive(db);
  rec.courses = rec.courses.filter((c) => c.id !== courseId);
  await putTT(db, rec);
  return true;
}
export async function clearTimetable() {
  const db = await openDB();
  const rec = await ensureActive(db);
  rec.courses = [];
  await putTT(db, rec);
  return true;
}

// --- 다중 시간표 관리 API ---
export async function listTimetables() {
  const db = await openDB();
  return sortByCreated(await getAll(db, TT));
}
export async function getActiveTimetable() {
  const db = await openDB();
  return ensureActive(db);
}
export async function getActiveId() {
  const db = await openDB();
  const a = await getOne(db, APP, "activeId");
  return a?.value ?? null;
}
export async function setActiveTimetable(id) {
  const db = await openDB();
  await putApp(db, "activeId", id);
  return true;
}
export async function createTimetable({ name, year, term, courses = [] }) {
  const db = await openDB();
  const rec = {
    name: name || "새 시간표",
    year: year ?? 2026,
    term: term || "1학기",
    courses,
    createdAt: Date.now(),
  };
  const id = await addTT(db, rec);
  await putApp(db, "activeId", id);
  return id;
}
export async function deleteTimetable(id) {
  const db = await openDB();
  await new Promise((res, rej) => {
    const t = db.transaction(TT, "readwrite");
    t.objectStore(TT).delete(id);
    t.oncomplete = () => res();
    t.onerror = (e) => rej(e.target.error);
  });
  const active = await getOne(db, APP, "activeId");
  if (active?.value === id) {
    const all = sortByCreated(await getAll(db, TT));
    await putApp(db, "activeId", all[0]?.id ?? null);
  }
  return true;
}
