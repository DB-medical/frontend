import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest, ApiError } from "../lib/api";
import {
  badgeClass,
  buttonGhost,
  buttonPrimary,
  inputClass,
  labelClass,
  panelClass,
  textareaClass,
} from "./uiStyles";
import type {
  MedicalRecordPayload,
  MedicalRecordSummary,
  MedicineSearchResult,
  PersonSummary,
  Role,
} from "../types/api";

interface MedicalRecordsPanelProps {
  token: string | null;
  role: Role | null;
}

interface MedicineDraft {
  name: string;
  medicineId?: string;
  dosage?: string;
  instruction?: string;
}

const createInitialRecordState = () => ({
  visitDate: "",
  diagnosis: "",
  patientId: null as number | null,
  patientName: "",
  patientSsn: "",
  patientPhone: "",
  symptoms: "",
  treatments: "",
});

export function MedicalRecordsPanel({ token, role }: MedicalRecordsPanelProps) {
  const [recordForm, setRecordForm] = useState(createInitialRecordState());
  const [medicines, setMedicines] = useState<MedicineDraft[]>([]);
  const [patientOptions, setPatientOptions] = useState<PersonSummary[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showMedicinePicker, setShowMedicinePicker] = useState(false);
  const [activeMedicineIndex, setActiveMedicineIndex] = useState<number | null>(
    null
  );
  const [medicineOptions, setMedicineOptions] = useState<
    MedicineSearchResult[]
  >([]);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const disabled = role !== "DOCTOR" || !token;

  const loadPatients = async () => {
    if (disabled) return;
    setPatientLoading(true);
    try {
      const records = await apiRequest<MedicalRecordSummary[]>(
        "/medical-records",
        { token }
      );
      const map = new Map<number, PersonSummary>();
      records.forEach((record) => {
        if (record.patient?.id) {
          map.set(record.patient.id, record.patient);
        }
      });
      setPatientOptions(Array.from(map.values()));
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : "환자 목록을 불러오지 못했습니다.";
      setMessage(errMessage);
    } finally {
      setPatientLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patientOptions;
    const keyword = patientSearch.toLowerCase();
    return patientOptions.filter((patient) =>
      patient.name.toLowerCase().includes(keyword)
    );
  }, [patientOptions, patientSearch]);

  const openPatientPicker = async () => {
    if (disabled) return;
    setShowPatientPicker(true);
    if (patientOptions.length === 0) {
      await loadPatients();
    }
  };

  const closePatientPicker = () => {
    setShowPatientPicker(false);
  };

  const openMedicinePicker = (index: number) => {
    if (disabled) return;
    setActiveMedicineIndex(index);
    setShowMedicinePicker(true);
    setMedicineOptions([]);
    setMedicineSearch("");
  };

  const closeMedicinePicker = () => {
    setShowMedicinePicker(false);
    setActiveMedicineIndex(null);
    setMedicineOptions([]);
    setMedicineSearch("");
  };

  const fetchMedicines = async () => {
    if (disabled) return;
    if (!medicineSearch.trim()) {
      setMedicineOptions([]);
      setMessage("약품명을 입력해 검색해 주세요.");
      return;
    }
    setMedicineLoading(true);
    try {
      const keyword = encodeURIComponent(medicineSearch.trim());
      const results = await apiRequest<MedicineSearchResult[]>(
        `/medicines?keyword=${keyword}`,
        {
          token,
        }
      );
      setMedicineOptions(results);
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : "의약품 목록을 불러오지 못했습니다.";
      setMessage(errMessage);
    } finally {
      setMedicineLoading(false);
    }
  };

  const handleSelectPatient = (patient: PersonSummary) => {
    setRecordForm((prev) => ({
      ...prev,
      patientId: patient.id ?? null,
      patientName: patient.name ?? prev.patientName,
      patientSsn: patient.ssn ?? "",
      patientPhone: patient.phone ?? "",
    }));
    setMessage("환자 정보를 입력 폼에 적용했습니다.");
  };

  const handleSelectMedicine = (candidate: MedicineSearchResult) => {
    if (activeMedicineIndex === null) {
      setMessage("적용할 처방 약품을 먼저 선택하세요.");
      return;
    }
    updateMedicine(activeMedicineIndex, {
      medicineId: candidate.id ? String(candidate.id) : "",
      name: candidate.name,
    });
    setMessage(`"${candidate.name}" 약품을 처방 목록에 적용했습니다.`);
    closeMedicinePicker();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled) {
      setMessage("의사 계정으로 로그인 후 작성하세요.");
      return;
    }

    const symptomPayload = recordForm.symptoms
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const treatmentPayload = recordForm.treatments
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const payload: MedicalRecordPayload = {
      visitDate: recordForm.visitDate,
      diagnosis: recordForm.diagnosis,
      patient: {
        id: recordForm.patientId ?? undefined,
        name: recordForm.patientName,
        ssn: recordForm.patientSsn || undefined,
        phone: recordForm.patientPhone || undefined,
      },
      symptoms: symptomPayload.length > 0 ? symptomPayload : undefined,
      treatments: treatmentPayload.length > 0 ? treatmentPayload : undefined,
      prescription:
        medicines.length > 0
          ? {
              medicines: medicines.map((medicine) => ({
                medicineId: medicine.medicineId
                  ? Number(medicine.medicineId)
                  : undefined,
                name: medicine.name,
                dosage: medicine.dosage,
                instruction: medicine.instruction,
              })),
            }
          : undefined,
    };

    setLoading(true);
    setMessage(null);
    try {
      await apiRequest("/medical-records", {
        method: "POST",
        json: payload,
        token,
      });
      setMessage("진료 기록이 저장되었습니다.");
      setRecordForm(createInitialRecordState());
      setMedicines([]);
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : "진료 기록을 저장하지 못했습니다.";
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const addMedicine = () => {
    setMedicines((prev) => [...prev, { name: "", medicineId: "" }]);
  };

  const updateMedicine = (index: number, patch: Partial<MedicineDraft>) => {
    setMedicines((prev) =>
      prev.map((medicine, idx) =>
        idx === index ? { ...medicine, ...patch } : medicine
      )
    );
  };

  const removeMedicine = (index: number) => {
    setMedicines((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <section className={`${panelClass} gap-6`}>
      <header>
        <p className={badgeClass}>진료 기록</p>
        <h3 className="text-xl font-semibold text-slate-900">
          환자 검색 · 진료 기록 작성
        </h3>
        <p className="text-sm text-slate-500">
          의사 권한 전용. 처방 작성 시 약 정보까지 함께 전달됩니다.
        </p>
      </header>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonGhost}
            onClick={openPatientPicker}
            disabled={disabled}
          >
            기존 환자 보기
          </button>
        </div>

        {showPatientPicker ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 text-sm font-semibold text-slate-700">
                기존 환자 검색
                <input
                  className={`${inputClass} mt-1`}
                  placeholder="이름으로 검색"
                  value={patientSearch}
                  onChange={(event) => setPatientSearch(event.target.value)}
                  disabled={disabled || patientLoading}
                />
              </label>
              <button
                type="button"
                className={buttonGhost}
                onClick={loadPatients}
                disabled={disabled || patientLoading}
              >
                목록 새로고침
              </button>
              <button
                type="button"
                className={buttonGhost}
                onClick={closePatientPicker}
              >
                닫기
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {filteredPatients.length === 0 ? (
                <p className="text-sm text-slate-500">
                  등록된 환자가 없거나 검색 결과가 없습니다.
                </p>
              ) : (
                filteredPatients.map((patient) => (
                  <article
                    key={patient.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div>
                      <strong className="text-sm text-slate-900">
                        {patient.name}
                      </strong>
                      <p className="text-xs text-slate-500">ID: {patient.id}</p>
                    </div>
                    <button
                      type="button"
                      className={buttonGhost}
                      onClick={() => handleSelectPatient(patient)}
                      disabled={disabled}
                    >
                      선택
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        ) : null}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className={labelClass}>
            방문일
            <input
              type="date"
              className={inputClass}
              value={recordForm.visitDate}
              onChange={(event) =>
                setRecordForm((prev) => ({
                  ...prev,
                  visitDate: event.target.value,
                }))
              }
              required
              disabled={disabled}
            />
          </label>
          <label className={labelClass}>
            진단명
            <input
              className={inputClass}
              value={recordForm.diagnosis}
              onChange={(event) =>
                setRecordForm((prev) => ({
                  ...prev,
                  diagnosis: event.target.value,
                }))
              }
              required
              disabled={disabled}
            />
          </label>
          <label className={labelClass}>
            환자 이름
            <input
              className={inputClass}
              value={recordForm.patientName}
              onChange={(event) =>
                setRecordForm((prev) => ({
                  ...prev,
                  patientName: event.target.value,
                }))
              }
              required
              disabled={disabled}
            />
          </label>
          <label className={labelClass}>
            환자 주민번호
            <input
              className={inputClass}
              value={recordForm.patientSsn}
              onChange={(event) =>
                setRecordForm((prev) => ({
                  ...prev,
                  patientSsn: event.target.value,
                }))
              }
              disabled={disabled}
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            환자 연락처
            <input
              className={inputClass}
              value={recordForm.patientPhone}
              onChange={(event) =>
                setRecordForm((prev) => ({
                  ...prev,
                  patientPhone: event.target.value,
                }))
              }
              disabled={disabled}
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            증상 목록 (쉼표 구분)
            <textarea
              className={textareaClass}
              value={recordForm.symptoms}
              onChange={(event) =>
                setRecordForm((prev) => ({
                  ...prev,
                  symptoms: event.target.value,
                }))
              }
              placeholder="기침, 발열, 근육통"
              disabled={disabled}
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            치료 계획 (쉼표 구분)
            <textarea
              className={textareaClass}
              value={recordForm.treatments}
              onChange={(event) =>
                setRecordForm((prev) => ({
                  ...prev,
                  treatments: event.target.value,
                }))
              }
              placeholder="해열제 처방, 3일 휴식"
              disabled={disabled}
            />
          </label>

          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <strong className="text-sm text-slate-800">처방 약품</strong>
              <button
                type="button"
                className={buttonGhost}
                onClick={addMedicine}
                disabled={disabled}
              >
                약 추가
              </button>
            </div>
            {medicines.length === 0 ? (
              <p className="text-sm text-slate-500">
                필요한 경우 약품을 추가하세요.
              </p>
            ) : null}
            {medicines.map((medicine, index) => (
              <div
                className="space-y-3 rounded-2xl border border-slate-200 p-4"
                key={`medicine-${index}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    처방 {index + 1}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonGhost}
                      onClick={() => openMedicinePicker(index)}
                      disabled={disabled}
                    >
                      기존 약 검색
                    </button>
                    <button
                      type="button"
                      className={`${buttonGhost} text-red-500`}
                      onClick={() => removeMedicine(index)}
                      disabled={disabled}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <input
                    className={inputClass}
                    placeholder="약품명"
                    value={medicine.name}
                    onChange={(event) =>
                      updateMedicine(index, { name: event.target.value })
                    }
                    required
                    disabled={disabled}
                  />
                  <input
                    className={inputClass}
                    placeholder="약품 ID (선택)"
                    value={medicine.medicineId ?? ""}
                    onChange={(event) =>
                      updateMedicine(index, { medicineId: event.target.value })
                    }
                    disabled={disabled}
                  />
                  <input
                    className={inputClass}
                    placeholder="복용량"
                    value={medicine.dosage ?? ""}
                    onChange={(event) =>
                      updateMedicine(index, { dosage: event.target.value })
                    }
                    disabled={disabled}
                  />
                  <input
                    className={inputClass}
                    placeholder="복약 지시"
                    value={medicine.instruction ?? ""}
                    onChange={(event) =>
                      updateMedicine(index, { instruction: event.target.value })
                    }
                    disabled={disabled}
                  />
                </div>
              </div>
            ))}
          </div>

          {showMedicinePicker ? (
            <div className="md:col-span-2 space-y-3 rounded-2xl border border-slate-200 bg-blue-50/70 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 text-sm font-semibold text-slate-700">
                  의약품 검색
                  <input
                    className={`${inputClass} mt-1`}
                    placeholder="의약품 이름으로 검색"
                    value={medicineSearch}
                    onChange={(event) => setMedicineSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void fetchMedicines();
                      }
                    }}
                    disabled={disabled || medicineLoading}
                  />
                </label>
                <button
                  type="button"
                  className={buttonGhost}
                  onClick={() => void fetchMedicines()}
                  disabled={disabled || medicineLoading}
                >
                  검색
                </button>
                <button
                  type="button"
                  className={buttonGhost}
                  onClick={closeMedicinePicker}
                >
                  닫기
                </button>
              </div>
              <p className="text-xs text-slate-600">
                적용 대상:{" "}
                {activeMedicineIndex !== null
                  ? `${activeMedicineIndex + 1}번째 처방 약품`
                  : "처방 약품을 먼저 선택하세요."}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {medicineLoading ? (
                  <p className="text-sm text-slate-500">
                    약품을 검색 중입니다...
                  </p>
                ) : medicineOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    검색 결과가 없습니다.
                  </p>
                ) : (
                  medicineOptions.map((option) => (
                    <article
                      key={option.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div>
                        <strong className="text-sm text-slate-900">
                          {option.name}
                        </strong>
                        <p className="text-xs text-slate-500">
                          ID: {option.id}{" "}
                          {option.manufacturer
                            ? `· ${option.manufacturer}`
                            : null}
                        </p>
                        {option.efficacy ? (
                          <p className="text-xs text-slate-400">
                            {option.efficacy}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={buttonGhost}
                        onClick={() => handleSelectMedicine(option)}
                        disabled={disabled}
                      >
                        선택
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              className={buttonPrimary}
              disabled={disabled || loading}
            >
              {loading ? "전송 중..." : "진료 기록 저장"}
            </button>
          </div>
        </form>
        {message ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </p>
        ) : null}
        {disabled ? (
          <p className="text-sm text-slate-500">
            의사 권한으로 로그인해야 진료 기록을 작성할 수 있습니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}
