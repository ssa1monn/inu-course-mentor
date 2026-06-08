// 졸업요건 시드 (졸업요건.pdf 기반).
// 인천대 컴퓨터공학부(정보기술대학, 자연·공학계열) 기준.
// 입학년도 그룹: 2019~2022 / 2023 이후 두 가지만 반영.
//
// 졸업요건은 묶음 단위로 계산한다:
//  - 전공: 전공기초+전공핵심+전공심화 합산
//  - 교양: 기초교양+핵심교양+심화교양 합산
//  - 총학점: 전체 합산
//  - 영어졸업인증 / 졸업작품발표: 학점이 아닌 충족 항목(requiredCredits=0, etcRequirement에 설명)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEPT = "컴퓨터공학부";

// 관리자 계정 시드 (idempotent)
async function seedAdmin() {
  const passwordHash = await bcrypt.hash("admininucm2026!", 10);
  await prisma.user.upsert({
    where: { email: "admin" },
    update: { passwordHash, isAdmin: true },
    create: {
      email: "admin",
      passwordHash,
      name: "관리자",
      department: "관리자",
      admissionYear: 2026,
      grade: 1,
      semester: 1,
      isAdmin: true,
    },
  });
  console.log("Seeded admin account (id: admin)");
}

// 그룹별 규칙 (전공/교양/총학점 + 비학점 요건)
const GROUP_A = [
  // 2019~2022 학번
  { area: "전공", requiredCredits: 72, etcRequirement: "전공기초+전공필수(캡스톤디자인 I/II 포함 19학점 이상)+전공선택" },
  { area: "교양", requiredCredits: 30, etcRequirement: "기초+핵심+심화 합산 30~55학점. 자연·공학계열 기초교양 12~14학점(국어2/Academic English 2/회화2/SW 2/대학수학6), 핵심교양 3과목 이상, 심화교양 자유" },
  { area: "총학점", requiredCredits: 140, etcRequirement: "교과이수 140학점 이상" },
  { area: "영어졸업인증", requiredCredits: 0, etcRequirement: "정보기술대학 기준 TOEIC 700 / TOEFL(IBT) 82 / TEPS 264 / OPIc IM 등" },
  { area: "졸업작품발표", requiredCredits: 0, etcRequirement: "2인 이상 교수 심사에서 D 이상" },
];

const GROUP_B = [
  // 2023 학번 이후
  { area: "전공", requiredCredits: 72, etcRequirement: "전공기초+전공필수(캡스톤디자인 I/II 포함 19학점 이상)+전공선택" },
  { area: "교양", requiredCredits: 30, etcRequirement: "기초+핵심+심화 합산 30~55학점. 자연·공학계열 기초교양 12~14학점(글쓰기이론과실제2/Academic English 2/대학영어회화2/컴퓨팅적사고와SW 2/대학수학6), 핵심교양 3과목 이상, 심화교양 자유" },
  { area: "총학점", requiredCredits: 130, etcRequirement: "교과이수 130학점 이상" },
  { area: "영어졸업인증", requiredCredits: 0, etcRequirement: "정보기술대학 기준 TOEIC 700 / TOEFL(IBT) 82 / TEPS 264 / OPIc IM 등" },
  { area: "졸업작품발표", requiredCredits: 0, etcRequirement: "2인 이상 교수 심사에서 D 이상" },
];

const YEARS_A = [2019, 2020, 2021, 2022];
const YEARS_B = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

async function seedYears(years, rules) {
  for (const year of years) {
    await prisma.gradReqRule.deleteMany({ where: { department: DEPT, admissionYear: year } });
    for (const rule of rules) {
      await prisma.gradReqRule.create({ data: { department: DEPT, admissionYear: year, ...rule } });
    }
  }
}

async function main() {
  await seedYears(YEARS_A, GROUP_A);
  await seedYears(YEARS_B, GROUP_B);
  console.log(`Seeded grad-req rules for ${DEPT}: 2019~2022 (총 140), 2023+ (총 130)`);
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
