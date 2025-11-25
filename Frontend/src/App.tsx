import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthPanel } from "./components/AuthPanel";
import { PrescriptionsPanel } from "./components/PrescriptionsPanel";
import { DoctorWorkspace } from "./components/DoctorWorkspace";
import {
  buttonGhost,
  buttonPrimary,
  linkButton,
  panelClass,
  badgeClass,
} from "./components/uiStyles";
import { apiRequest } from "./lib/api";
import type { DoctorProfileInfo, PrescriptionSummary, Role } from "./types/api";

type Page =
  | "home"
  | "auth"
  | "doctor-workspace"
  | "pharmacist-dashboard"
  | "prescriptions";

interface AuthState {
  token: string | null;
  role: Role | null;
  email: string | null;
  name: string | null;
  doctorProfile: DoctorProfileInfo | null;
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    role: null,
    email: null,
    name: null,
    doctorProfile: null,
  });
  const [page, setPage] = useState<Page>("home");
  const [pendingReceivedCount, setPendingReceivedCount] = useState<
    number | null
  >(null);

  const refreshPendingReceivedCount = useCallback(async () => {
    if (authState.role !== "PHARMACIST" || !authState.token) {
      setPendingReceivedCount(null);
      return;
    }
    try {
      const data = await apiRequest<PrescriptionSummary[]>("/prescriptions", {
        token: authState.token,
      });
      const pending = data.filter((item) => item.status === "RECEIVED").length;
      setPendingReceivedCount(pending);
    } catch {
      setPendingReceivedCount(null);
    }
  }, [authState.role, authState.token]);

  const roleLabel = useMemo(() => {
    if (!authState.role) return "로그인 필요";
    return authState.role === "DOCTOR" ? "의사" : "약사";
  }, [authState.role]);

  useEffect(() => {
    void refreshPendingReceivedCount();
  }, [refreshPendingReceivedCount]);

  const goToDashboard = () => {
    if (authState.role === "DOCTOR") {
      setPage("doctor-workspace");
      return;
    }
    if (authState.role === "PHARMACIST") {
      setPage("pharmacist-dashboard");
    }
  };

  const handleLogout = () => {
    setAuthState({
      token: null,
      role: null,
      email: null,
      name: null,
      doctorProfile: null,
    });
    setPage("home");
  };

  const renderHome = () => (
    <section className="grid gap-8 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-rose-50/80 p-8 lg:grid-cols-2">
      <div className="space-y-4">
        <p className={badgeClass}>Medical System</p>
        <h1 className="text-3xl font-bold text-slate-900 lg:text-4xl">
          병·의원을 위한 통합 처방 관리
        </h1>
        <p className="text-sm text-slate-500">
          진료 기록 작성, 약국 검색, 처방전 상태 관리까지 한 화면에서 작업할 수
          있습니다.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            className={buttonPrimary}
            onClick={() =>
              setPage(
                authState.token
                  ? authState.role === "DOCTOR"
                    ? "doctor-workspace"
                    : "pharmacist-dashboard"
                  : "auth"
              )
            }
          >
            {authState.token ? "대시보드로 이동" : "로그인 / 회원가입"}
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg backdrop-blur">
        <p className="text-sm text-slate-500">현재 상태</p>
        <p className="text-2xl font-semibold text-slate-900">{roleLabel}</p>
        {authState.token ? (
          <>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 shadow-sm">
                <dt className="text-slate-500">이름</dt>
                <dd className="font-semibold text-slate-900">
                  {authState.name ?? "등록되지 않음"}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 shadow-sm">
                <dt className="text-slate-500">이메일</dt>
                <dd className="font-semibold text-slate-900">
                  {authState.email}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 shadow-sm">
                <dt className="text-slate-500">직종</dt>
                <dd className="font-semibold text-slate-900">{roleLabel}</dd>
              </div>
            </dl>
            {authState.role === "DOCTOR" && authState.doctorProfile ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">소속 정보</p>
                <p>
                  병원:{" "}
                  <span className="font-semibold text-slate-900">
                    {authState.doctorProfile.hospitalName ?? "미등록"}
                  </span>
                </p>
                <p>
                  진료과:{" "}
                  <span className="font-semibold text-slate-900">
                    {authState.doctorProfile.departmentName ?? "미등록"}
                  </span>
                </p>
              </div>
            ) : null}
            {authState.role === "PHARMACIST" ? (
              <p className="mt-3 text-sm font-semibold text-indigo-600">
                접수 상태 처방전:{" "}
                {pendingReceivedCount !== null
                  ? `${pendingReceivedCount}건`
                  : "불러오는 중..."}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            {authState.email ?? "로그인이 필요합니다."}
          </p>
        )}
      </div>
    </section>
  );

  const renderAuthPage = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={badgeClass}>Sign In · Sign Up</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            로그인하여 시스템에 접속하세요
          </h2>
        </div>
        <button className={buttonGhost} onClick={() => setPage("home")}>
          ← 메인으로
        </button>
      </div>
      <AuthPanel
        token={authState.token}
        role={authState.role}
        onLogin={({ accessToken, role, email, name, doctorProfile }) => {
          setAuthState({
            token: accessToken,
            role,
            email,
            name,
            doctorProfile: doctorProfile ?? null,
          });
          setPage("home");
        }}
        onLogout={handleLogout}
      />
    </div>
  );

  const renderDoctorWorkspace = () => (
    <DoctorWorkspace
      token={authState.token}
      role={authState.role}
      doctorProfile={authState.doctorProfile}
      doctorName={authState.name}
      doctorEmail={authState.email}
      onNavigateHome={() => setPage("home")}
    />
  );

  const renderPharmacistDashboard = () => {
    if (authState.role !== "PHARMACIST") {
      return (
        <section className={panelClass}>
          <p className="text-sm text-slate-500">
            약사 계정으로 로그인하면 이용할 수 있습니다.
          </p>
        </section>
      );
    }
    return (
      <div className={`${panelClass} gap-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={badgeClass}>Pharmacist Workspace</p>
            <h2 className="text-2xl font-semibold text-slate-900">
              처방전 목록 · 상세
            </h2>
            <p className="text-sm text-slate-500">
              내 약국으로 전송된 처방전을 한 화면에서 확인하고 상태를
              업데이트하세요.
            </p>
          </div>
          <button className={buttonGhost} onClick={() => setPage("home")}>
            ← 메인으로
          </button>
        </div>
        <PrescriptionsPanel
          token={authState.token}
          role={authState.role}
          onStatusUpdated={refreshPendingReceivedCount}
        />
      </div>
    );
  };

  const renderPrescriptions = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {authState.role === "DOCTOR" ? (
          <button
            className={linkButton}
            onClick={() => setPage("doctor-workspace")}
          >
            ← 의사 대시보드
          </button>
        ) : null}
        {authState.role === "PHARMACIST" ? (
          <button
            className={linkButton}
            onClick={() => setPage("pharmacist-dashboard")}
          >
            ← 약사 대시보드
          </button>
        ) : null}
        <div>
          <p className={badgeClass}>Prescriptions</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            처방전 목록 · 상세
          </h2>
        </div>
      </div>
      <PrescriptionsPanel
        token={authState.token}
        role={authState.role}
        onStatusUpdated={refreshPendingReceivedCount}
      />
    </div>
  );

  const renderPage = () => {
    switch (page) {
      case "auth":
        return renderAuthPage();
      case "doctor-workspace":
        return authState.token ? renderDoctorWorkspace() : renderAuthPage();
      case "pharmacist-dashboard":
        return authState.token ? renderPharmacistDashboard() : renderAuthPage();
      case "prescriptions":
        return authState.token ? renderPrescriptions() : renderAuthPage();
      case "home":
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          className="text-lg font-bold text-slate-900"
          onClick={() => setPage("home")}
        >
          Medical System
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {authState.token ? (
            <>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {roleLabel}
              </span>
              <button className={linkButton} onClick={goToDashboard}>
                대시보드
              </button>
              <button className={buttonGhost} onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <button className={buttonGhost} onClick={() => setPage("auth")}>
              로그인
            </button>
          )}
        </div>
      </nav>
      <main className="mx-auto mt-8 flex max-w-6xl flex-col gap-8">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
