import { useState } from "react";
import { MedicalRecordsPanel } from "./MedicalRecordsPanel";
import { PharmacySearchPanel } from "./PharmacySearchPanel";
import { PrescriptionsPanel } from "./PrescriptionsPanel";
import { PatientRecordsPanel } from "./PatientRecordsPanel";
import { AllRecordsPanel } from "./AllRecordsPanel";
import { badgeClass, buttonGhost, panelClass } from "./uiStyles";
import type { DoctorProfileInfo, Role } from "../types/api";

type DoctorTab = "create" | "patient" | "all" | "pharmacy" | "prescriptions";

interface DoctorWorkspaceProps {
  token: string | null;
  role: Role | null;
  doctorProfile: DoctorProfileInfo | null;
  doctorName: string | null;
  doctorEmail: string | null;
  onNavigateHome: () => void;
}

const TAB_META: Record<
  DoctorTab,
  { label: string; description: string; helper: string }
> = {
  create: {
    label: "진료 기록 작성",
    description: "환자 정보 입력 및 처방 등록",
    helper: "환자 선택 후 진단/치료/약품 정보를 작성하세요.",
  },
  patient: {
    label: "환자별 기록 조회",
    description: "환자별 진료 기록 확인",
    helper: "환자이름으로 검색하여 환자별 진료 기록을 조회합니다.",
  },
  all: {
    label: "전체 진료 기록",
    description: "모든 환자의 진료 기록을 열람하고 상세보기",
    helper: "전체 진료 목록에서 원하는 기록을 골라 확인합니다.",
  },
  pharmacy: {
    label: "약국 검색/전송",
    description: "처방전을 약국으로 전송",
    helper: "약국 키워드 검색 후 선택한 약국으로 전송합니다.",
  },
  prescriptions: {
    label: "처방전 현황",
    description: "작성한 처방을 조회하고 관리",
    helper: "처방 목록과 상세, 상태 변경을 한 화면에서 확인합니다.",
  },
};

export function DoctorWorkspace({
  token,
  role,
  doctorProfile,
  doctorName,
  doctorEmail,
  onNavigateHome,
}: DoctorWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<DoctorTab>("create");
  const isDoctor = role === "DOCTOR";

  const renderContent = () => {
    switch (activeTab) {
      case "create":
        return <MedicalRecordsPanel token={token} role={role} />;
      case "patient":
        return <PatientRecordsPanel token={token} role={role} />;
      case "all":
        return <AllRecordsPanel token={token} role={role} />;
      case "pharmacy":
        return <PharmacySearchPanel token={token} role={role} />;
      case "prescriptions":
      default:
        return <PrescriptionsPanel token={token} role={role} />;
    }
  };

  if (!isDoctor) {
    return (
      <section className={panelClass}>
        <p className="text-sm text-slate-500">
          의사 계정으로 로그인해야 워크스페이스를 이용할 수 있습니다.
        </p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="flex-shrink-0 space-y-4 lg:w-80">
        <div className={`${panelClass} gap-2`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={badgeClass}>의사 정보</p>
              <h2 className="text-xl font-semibold text-slate-900">
                {doctorName ?? "의사"}
              </h2>
            </div>
            <button className={buttonGhost} onClick={onNavigateHome}>
              ← 메인
            </button>
          </div>
          <p className="text-sm text-slate-500">
            {doctorEmail ?? "이메일 정보가 없습니다."}
          </p>
          {doctorProfile ? (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">병원</dt>
                <dd className="font-semibold text-slate-900">
                  {doctorProfile.hospitalName ?? "미등록"}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <dt className="text-slate-500">진료과</dt>
                <dd className="font-semibold text-slate-900">
                  {doctorProfile.departmentName ?? "미등록"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              진료과/병원 정보가 없습니다.
            </p>
          )}
        </div>
        <div className={`${panelClass} gap-3`}>
          <h2 className="text-xl font-semibold text-slate-900">업무 선택</h2>
          {(Object.keys(TAB_META) as DoctorTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                activeTab === tab
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:border-indigo-200"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <strong className="block text-sm font-semibold">
                {TAB_META[tab].label}
              </strong>
              <span className="text-xs text-slate-500">
                {TAB_META[tab].description}
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className={`${panelClass} flex-1 gap-4`}>
        <div>
          <p className={badgeClass}>{TAB_META[activeTab].label}</p>
          <h3 className="text-lg font-semibold text-slate-900">
            {TAB_META[activeTab].description}
          </h3>
          <p className="text-sm text-slate-500">{TAB_META[activeTab].helper}</p>
        </div>
        {renderContent()}
      </section>
    </div>
  );
}
