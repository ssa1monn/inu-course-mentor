import { meetingsToText } from "../lib/time.js";
import Icon from "./Icon.jsx";

function Row({ icon, text, hot }) {
  return (
    <div className="flex min-w-0 items-center gap-2" style={{ color: hot ? "var(--inu-sky)" : "var(--text-2)" }}>
      <Icon name={icon} size={15} style={{ flex: "none" }} />
      <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontWeight: hot ? 600 : 500 }}>{text}</span>
    </div>
  );
}

// onAdd가 있으면 "담기" 버튼. conflict면 충돌 스타일.
export default function CourseCard({ course, onAdd, onRemove, inTimetable, conflict }) {
  const isMajor = (course.courseType || "").startsWith("전공");
  return (
    <div className="card flex flex-col gap-3" style={{
      padding: 17,
      borderColor: conflict ? "color-mix(in srgb, var(--danger) 45%, var(--border))" : undefined,
      background: conflict ? "color-mix(in srgb, var(--danger-soft) 60%, var(--surface))" : undefined,
    }}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h3 className="m-0 text-[15.5px] font-extrabold tracking-tight text-fg">{course.title}</h3>
          <div className="mt-1.5 text-xs text-fg-faint">{course.courseCode} · {course.professor || "교수미정"}</div>
        </div>
        <span className={`badge flex-none ${isMajor ? "badge-blue" : "badge-neutral"}`}>{course.courseType}</span>
      </div>

      <div className="flex flex-col gap-1.5 text-[13px]">
        <Row icon="clock" text={meetingsToText(course.meetings)} hot />
        <Row icon="pin" text={course.room || "강의실 미지정 (RISE)"} />
        <Row icon="user" text={`${course.department} · ${course.targetGrade === "전학년" ? "전학년" : course.targetGrade + "학년"}`} />
      </div>

      {conflict && <div className="badge badge-danger self-start"><Icon name="info" size={13} /> 시간 겹침</div>}

      <div className="mt-0.5 flex items-center justify-between">
        <span className="num badge badge-yellow text-[12.5px]">{course.credits}학점</span>
        {inTimetable ? (
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(course.id)}><Icon name="check" size={15} /> 담김 · 빼기</button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => onAdd(course)}><Icon name="plus" size={15} /> 시간표 담기</button>
        )}
      </div>
    </div>
  );
}
