import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest, ApiError } from "../lib/api";
import {
  badgeClass,
  buttonPrimary,
  buttonSecondary,
  inputClass,
  labelClass,
  panelClass,
} from "./uiStyles";
import type { LoginResponse, Role, SignupPayload } from "../types/api";

interface AuthPanelProps {
  token: string | null;
  role: Role | null;
  onLogin: (payload: LoginResponse & { email: string }) => void;
  onLogout: () => void;
}

const createDefaultSignupState = (): SignupPayload & {
  doctorProfile: Required<NonNullable<SignupPayload["doctorProfile"]>>;
  pharmacistProfile: Required<NonNullable<SignupPayload["pharmacistProfile"]>>;
} => ({
  email: "",
  name: "",
  password: "",
  passwordConfirm: "",
  role: "DOCTOR",
  doctorProfile: { hospitalId: "", departmentId: "" },
  pharmacistProfile: { pharmacyId: "" },
});

export function AuthPanel({ token, role, onLogin, onLogout }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
    role: "DOCTOR" as Role,
  });
  const [signupForm, setSignupForm] = useState(createDefaultSignupState());
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isLoggedIn = Boolean(token);

  const activeRoleLabel = useMemo(() => {
    if (!role) return "미선택";
    return role === "DOCTOR" ? "의사" : "약사";
  }, [role]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const response = await apiRequest<LoginResponse>("/login", {
        method: "POST",
        json: loginForm,
        skipAuth: true,
      });
      onLogin({
        ...response,
        email: loginForm.email,
      });
      setFeedback("로그인에 성공했습니다.");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "로그인에 실패했습니다.";
      setFeedback(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);
    const {
      role: selectedRole,
      doctorProfile,
      pharmacistProfile,
      ...common
    } = signupForm;
    const payload: SignupPayload = {
      ...common,
      role: selectedRole,
      ...(selectedRole === "DOCTOR"
        ? { doctorProfile: { ...doctorProfile } }
        : { pharmacistProfile: { ...pharmacistProfile } }),
    };

    try {
      await apiRequest("/signup", {
        method: "POST",
        json: payload,
        skipAuth: true,
      });
      setFeedback("회원 가입이 완료되었습니다. 로그인해 주세요.");
      setMode("login");
      setSignupForm(createDefaultSignupState());
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "회원 가입에 실패했습니다.";
      setFeedback(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (active: boolean) =>
    `rounded-full border px-4 py-1 text-sm font-semibold transition ${
      active
        ? "border-indigo-600 bg-indigo-600 text-white"
        : "border-slate-200 text-slate-600 hover:border-indigo-200"
    }`;

  return (
    <section className={panelClass}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className={badgeClass}>인증</p>
          <h2 className="text-2xl font-semibold text-slate-900">
            로그인 및 회원 가입
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={toggleClass(mode === "login")}
            onClick={() => setMode("login")}
          >
            로그인
          </button>
          <button
            type="button"
            className={toggleClass(mode === "signup")}
            onClick={() => setMode("signup")}
          >
            회원 가입
          </button>
        </div>
      </header>

      {isLoggedIn ? (
        <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-slate-700">
          <p>
            현재{" "}
            <span className="font-semibold text-slate-900">
              {activeRoleLabel}
            </span>{" "}
            권한으로 인증되었습니다.
          </p>
          <button type="button" className={buttonSecondary} onClick={onLogout}>
            로그아웃
          </button>
        </div>
      ) : null}

      {mode === "login" ? (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleLogin}>
          <label className={labelClass}>
            이메일
            <input
              type="email"
              className={inputClass}
              placeholder="doctor@example.com"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className={labelClass}>
            비밀번호
            <input
              type="password"
              className={inputClass}
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className={labelClass}>
            직종
            <select
              className={inputClass}
              value={loginForm.role}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  role: event.target.value as Role,
                }))
              }
            >
              <option value="DOCTOR">의사</option>
              <option value="PHARMACIST">약사</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={buttonPrimary} disabled={loading}>
              {loading ? "요청 중..." : "로그인"}
            </button>
          </div>
        </form>
      ) : (
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSignup}>
          <label className={labelClass}>
            이름
            <input
              className={inputClass}
              value={signupForm.name}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, name: event.target.value }))
              }
              required
            />
          </label>
          <label className={labelClass}>
            이메일
            <input
              type="email"
              className={inputClass}
              value={signupForm.email}
              onChange={(event) =>
                setSignupForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className={labelClass}>
            비밀번호
            <input
              type="password"
              className={inputClass}
              value={signupForm.password}
              onChange={(event) =>
                setSignupForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className={labelClass}>
            비밀번호 확인
            <input
              type="password"
              className={inputClass}
              value={signupForm.passwordConfirm}
              onChange={(event) =>
                setSignupForm((prev) => ({
                  ...prev,
                  passwordConfirm: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            직종
            <select
              className={inputClass}
              value={signupForm.role}
              onChange={(event) =>
                setSignupForm((prev) => ({
                  ...prev,
                  role: event.target.value as Role,
                }))
              }
            >
              <option value="DOCTOR">의사</option>
              <option value="PHARMACIST">약사</option>
            </select>
          </label>

          {signupForm.role === "DOCTOR" ? (
            <>
              <label className={labelClass}>
                병원 ID
                <input
                  className={inputClass}
                  value={signupForm.doctorProfile.hospitalId}
                  onChange={(event) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      doctorProfile: {
                        ...prev.doctorProfile,
                        hospitalId: event.target.value,
                      },
                    }))
                  }
                  required
                />
              </label>
              <label className={labelClass}>
                진료과 ID
                <input
                  className={inputClass}
                  value={signupForm.doctorProfile.departmentId}
                  onChange={(event) =>
                    setSignupForm((prev) => ({
                      ...prev,
                      doctorProfile: {
                        ...prev.doctorProfile,
                        departmentId: event.target.value,
                      },
                    }))
                  }
                  required
                />
              </label>
            </>
          ) : (
            <label className={`${labelClass} sm:col-span-2`}>
              약국 ID
              <input
                className={inputClass}
                value={signupForm.pharmacistProfile.pharmacyId}
                onChange={(event) =>
                  setSignupForm((prev) => ({
                    ...prev,
                    pharmacistProfile: {
                      ...prev.pharmacistProfile,
                      pharmacyId: event.target.value,
                    },
                  }))
                }
                required
              />
            </label>
          )}

          <div className="sm:col-span-2">
            <button type="submit" className={buttonPrimary} disabled={loading}>
              {loading ? "요청 중..." : "회원 가입"}
            </button>
          </div>
        </form>
      )}

      {feedback ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
