export const JOBKOREA_ROLES = [
  "인사담당",
  "HRD",
  "리크루터",
  "HRBP",
  "조직문화",
] as const;

export type JobkoreaRole = (typeof JOBKOREA_ROLES)[number];

export interface JobkoreaPosting {
  role: JobkoreaRole;
  company: string;
  title: string;
  career: string;
  period: string;
  url: string;
}

export const JOBKOREA_POSTINGS: JobkoreaPosting[] = [
  {
    role: "인사담당",
    company: "주식회사 파수에이아이",
    title: "신입공채-컨설턴트/사업/경영지원/SW개발",
    career: "신입",
    period: "~07.12",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49452718?Oem_Code=C1&logpath=1&stext=%EC%9D%B8%EC%82%AC%EB%8B%B4%EB%8B%B9%EC%9E%90&listno=1&sc=630",
  },
  {
    role: "인사담당",
    company: "㈜현대홈쇼핑",
    title: "현대홈쇼핑 7월 경력직(GA영업지원), 전문직(CS지원, 재경) 채용공고",
    career: "신입·경력",
    period: "~07.12",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49484302?Oem_Code=C1&logpath=1&stext=%EC%9D%B8%EC%82%AC%EB%8B%B4%EB%8B%B9%EC%9E%90&listno=2&sc=630",
  },
  {
    role: "인사담당",
    company: "㈜누리켐",
    title: "경영지원 부문 채용",
    career: "경력",
    period: "~07.10",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49500757?Oem_Code=C1&logpath=1&stext=%EC%9D%B8%EC%82%AC%EB%8B%B4%EB%8B%B9%EC%9E%90&listno=3&sc=630",
  },
  {
    role: "인사담당",
    company: "㈜디비아이엔씨",
    title: "DB Inc. 2026년 채용연계형 인턴사원 모집",
    career: "경력무관",
    period: "~07.19",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49502040?Oem_Code=C1&logpath=1&stext=%EC%9D%B8%EC%82%AC%EB%8B%B4%EB%8B%B9%EC%9E%90&listno=4&sc=630",
  },
  {
    role: "HRD",
    company: "현대오토에버㈜",
    title: "2026년 3분기 현대오토에버 신입사원 모집",
    career: "신입",
    period: "~07.13",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49435790?Oem_Code=C1&logpath=1&stext=HRD&listno=2&sc=630",
  },
  {
    role: "HRD",
    company: "웍스피어(유)",
    title: "[웍스피어] 채용 담당자 (1년 계약직)",
    career: "경력 1년 이상",
    period: "~07.30",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49509094?Oem_Code=C1&logpath=1&stext=HRD&listno=3&sc=630",
  },
  {
    role: "HRD",
    company: "LS전선㈜",
    title: "[LS전선] 6월 본사 사무보조 촉탁직 채용",
    career: "경력 2년 이상",
    period: "~07.13",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49470879?Oem_Code=C1&logpath=1&stext=HRD&listno=4&sc=630",
  },
  {
    role: "리크루터",
    company: "㈜넥스트챕터",
    title: "리크루터(채용담당자)",
    career: "경력 2년 이상",
    period: "~07.26",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49461982?Oem_Code=C1&logpath=1&stext=%EB%A6%AC%ED%81%AC%EB%A3%A8%ED%84%B0&listno=1&sc=630",
  },
  {
    role: "리크루터",
    company: "소프트웨어원코리아(유)",
    title: "APAC 리크루터",
    career: "경력 3년 이상",
    period: "~07.23",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49440061?Oem_Code=C1&logpath=1&stext=%EB%A6%AC%ED%81%AC%EB%A3%A8%ED%84%B0&listno=2&sc=630",
  },
  {
    role: "리크루터",
    company: "㈜딥다이브(Deepdive Inc.)",
    title: "[딥다이브] 시니어 리크루터",
    career: "경력 5년 이상",
    period: "상시채용",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49311313?Oem_Code=C1&logpath=1&stext=%EB%A6%AC%ED%81%AC%EB%A3%A8%ED%84%B0&listno=3&sc=630",
  },
  {
    role: "리크루터",
    company: "㈜딥다이브(Deepdive Inc.)",
    title: "(딥다이브) 시니어 리크루터",
    career: "경력 5년 이상",
    period: "~08.03",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49311345?Oem_Code=C1&logpath=1&stext=%EB%A6%AC%ED%81%AC%EB%A3%A8%ED%84%B0&listno=4&sc=630",
  },
  {
    role: "HRBP",
    company: "주식회사스마일게이트",
    title: "[스마일게이트] [인사] 국내 HRBP",
    career: "경력 7년 이상",
    period: "~07.31",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49489789?Oem_Code=C1&logpath=1&stext=HRBP&listno=1&sc=630",
  },
  {
    role: "HRBP",
    company: "씨앤씨인터내셔널",
    title: "[화장품ODM상장사] HRBP(팀원)",
    career: "경력 5년 이상",
    period: "~08.01",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49294019?Oem_Code=C1&logpath=1&stext=HRBP&listno=2&sc=630",
  },
  {
    role: "HRBP",
    company: "메가존클라우드㈜",
    title: "HRBP(Planning) 담당자 채용",
    career: "경력 5년 이상",
    period: "상시채용",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49329664?Oem_Code=C1&logpath=1&stext=HRBP&listno=3&sc=630",
  },
  {
    role: "HRBP",
    company: "핀다",
    title: "HRBP(HR Business Partner)",
    career: "경력 5년 이상",
    period: "~07.19",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49413740?Oem_Code=C1&logpath=1&stext=HRBP&listno=4&sc=630",
  },
  {
    role: "조직문화",
    company: "삼양식품㈜",
    title: "[삼양식품] 교육/조직문화 담당",
    career: "경력 5년 이상",
    period: "~08.16",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49396732?Oem_Code=C1&logpath=1&stext=%EC%A1%B0%EC%A7%81%EB%AC%B8%ED%99%94&listno=1&sc=630",
  },
  {
    role: "조직문화",
    company: "하나손해보험 주식회사",
    title: "교육/조직문화 경력직 채용",
    career: "경력 3년 이상",
    period: "~07.12",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49480412?Oem_Code=C1&logpath=1&stext=%EC%A1%B0%EC%A7%81%EB%AC%B8%ED%99%94&listno=2&sc=630",
  },
  {
    role: "조직문화",
    company: "현대오토에버㈜",
    title: "2026년 3분기 현대오토에버 신입사원 모집",
    career: "신입",
    period: "~07.13",
    url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49435790?Oem_Code=C1&logpath=1&stext=%EC%A1%B0%EC%A7%81%EB%AC%B8%ED%99%94&listno=3&sc=630",
  },
];

export function getJobkoreaOpenUrl(role: JobkoreaRole) {
  const firstPosting = JOBKOREA_POSTINGS.find((posting) => posting.role === role);
  return firstPosting?.url ?? "https://www.jobkorea.co.kr/";
}
