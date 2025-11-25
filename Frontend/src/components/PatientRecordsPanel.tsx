import { useState } from "react";
import { apiRequest, ApiError } from "../lib/api";
import {
  badgeClass,
  buttonGhost,
  buttonPrimary,
  inputClass,
  labelClass,
  panelClass,
} from "./uiStyles";
import type {
  MedicalRecordDetail,
  MedicalRecordSummary,
  PatientLookupResponse,
  Role,
} from "../types/api";

interface PatientRecordsPanelProps {
  token: string | null;
  role: Role | null;
}

export function PatientRecordsPanel({ token, role }: PatientRecordsPanelProps) {
  const [nameQuery, setNameQuery] = useState("");
  const [patient, setPatient] = useState<PatientLookupResponse | null>(null);
  const [patientResults, setPatientResults] = useState<PatientLookupResponse[]>(
    []
  );
  const [records, setRecords] = useState<MedicalRecordSummary[]>([]);
  const [selectedRecord, setSelectedRecord] =
    useState<MedicalRecordDetail | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const disabled = role !== "DOCTOR" || !token;

  const fetchRecords = async (patientId: number) => {
    const list = await apiRequest<MedicalRecordSummary[]>(
      `/medical-records/patient/${patientId}`,
      { token }
    );
    setRecords(list);
    if (list.length > 0) {
      await selectRecord(list[0].recordId);
    } else {
      setSelectedRecord(null);
      setSelectedRecordId(null);
    }
  };

  const selectRecord = async (recordId: number) => {
    setSelectedRecordId(recordId);
    if (disabled) return;
    try {
      const detail = await apiRequest<MedicalRecordDetail>(
        `/medical-records/${recordId}`,
        {
          token,
        }
      );
      setSelectedRecord(detail);
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : "진료 기록 상세를 불러오지 못했습니다.";
      setMessage(errMessage);
    }
  };

  const handleSelectPatient = async (target: PatientLookupResponse) => {
    if (!target.id) {
      setMessage("선택한 환자의 ID가 없어 기록을 불러올 수 없습니다.");
      return;
    }
    setPatient(target);
    await fetchRecords(target.id);
    setMessage("환자 진료 기록을 불러왔습니다.");
  };

  const handleSearch = async () => {
    if (!nameQuery.trim() || disabled) return;
    setLoading(true);
    setMessage(null);
    try {
      const results = await apiRequest<PatientLookupResponse[]>(
        `/medical-records/patients?name=${encodeURIComponent(
          nameQuery.trim()
        )}`,
        { token }
      );
      setPatientResults(results);
      if (results.length === 0) {
        setMessage("일치하는 환자를 찾지 못했습니다.");
        setPatient(null);
        setRecords([]);
        setSelectedRecord(null);
        setSelectedRecordId(null);
        return;
      }
      if (results.length === 1 && results[0].id) {
        await handleSelectPatient(results[0]);
      } else {
        setMessage("환자 목록에서 대상을 선택하세요.");
        setPatient(null);
        setRecords([]);
        setSelectedRecord(null);
        setSelectedRecordId(null);
      }
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : "환자 정보를 불러오지 못했습니다.";
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`${panelClass} gap-6`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={badgeClass}>환자별 진료 기록</p>
          <h3 className="text-xl font-semibold text-slate-900">
            환자를 찾고 과거 진료기록을 조회하세요.
          </h3>
        </div>
        <button
          type="button"
          className={buttonGhost}
          onClick={() => {
            setNameQuery("");
            setPatient(null);
            setPatientResults([]);
            setRecords([]);
            setSelectedRecord(null);
            setSelectedRecordId(null);
            setMessage(null);
          }}
        >
          초기화
        </button>
      </header>

      <div className="flex flex-col gap-3 md:flex-row">
        <label className={`${labelClass} flex-1`}>
          환자 이름
          <input
            className={inputClass}
            value={nameQuery}
            onChange={(event) => setNameQuery(event.target.value)}
            placeholder="예: 김철수"
            disabled={disabled}
          />
        </label>
        <button
          type="button"
          className={`${buttonPrimary} md:w-40`}
          onClick={handleSearch}
          disabled={disabled || loading || !nameQuery.trim()}
        >
          {loading ? "조회 중..." : "환자 기록 조회"}
        </button>
      </div>

      {patientResults.length > 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-slate-800">검색 결과</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {patientResults.map((candidate) => (
              <article
                key={`${candidate.id ?? candidate.name}-${candidate.ssn}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <strong className="text-sm text-slate-900">
                    {candidate.name ?? "이름 없음"}
                  </strong>
                  <p className="text-xs text-slate-500">
                    ID: {candidate.id ?? "없음"}
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonGhost}
                  onClick={() => handleSelectPatient(candidate)}
                  disabled={disabled}
                >
                  선택
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {patient ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <p className={badgeClass}>환자 정보</p>
            <h4 className="text-lg font-semibold text-slate-900">
              {patient.name ?? "미등록"}
            </h4>
            <p className="text-sm text-slate-500">ID: {patient.id ?? "없음"}</p>
          </div>
          <div className="text-sm text-slate-500">
            <p>연락처: {patient.phone ?? "-"}</p>
            <p>주민번호: {patient.ssn ?? "-"}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="space-y-3 lg:w-64">
          <h4 className="text-sm font-semibold text-slate-900">
            진료 기록 목록
          </h4>
          {records.length === 0 ? (
            <p className="text-sm text-slate-500">
              조회된 진료 기록이 없습니다.
            </p>
          ) : (
            records.map((record) => (
              <button
                key={record.recordId}
                type="button"
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedRecordId === record.recordId
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-700 hover:border-indigo-200"
                }`}
                onClick={() => selectRecord(record.recordId)}
                disabled={disabled}
              >
                <strong className="block text-sm">{record.visitDate}</strong>
                <span className="text-xs text-slate-500">
                  {record.diagnosis}
                </span>
              </button>
            ))
          )}
        </aside>

        <article className="flex-1 rounded-2xl border border-slate-200 p-5 space-y-4">
          {selectedRecord ? (
            <>
              <header>
                <p className={badgeClass}>진단명</p>
                <h4 className="text-xl font-semibold text-slate-900">
                  {selectedRecord.diagnosis}
                </h4>
                <p className="text-sm text-slate-500">
                  진료일 {selectedRecord.visitDate}
                </p>
              </header>
              <div className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">
                  기록 ID #{selectedRecord.recordId}
                </p>
                <p>
                  환자{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.patient.name}
                  </span>
                </p>
                <div>
                  담당의{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.doctor.name}
                  </span>
                  <br />
                  {selectedRecord.doctor.departmentName ? (
                    <span className="text-xs text-slate-500">
                      {selectedRecord.doctor.departmentName} ·{" "}
                      {selectedRecord.doctor.hospitalName ?? "-"}
                    </span>
                  ) : null}
                </div>
              </div>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h5 className="text-sm font-semibold text-slate-900">
                    증상 요약
                  </h5>
                  {selectedRecord.symptoms.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      등록된 증상이 없습니다.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {selectedRecord.symptoms.map((symptom) => (
                        <li
                          key={symptom.id}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-900">
                            {symptom.name}
                          </span>
                          {symptom.bodyPart ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {symptom.bodyPart}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h5 className="text-sm font-semibold text-slate-900">
                    치료 계획
                  </h5>
                  {selectedRecord.treatments.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      등록된 치료 정보가 없습니다.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {selectedRecord.treatments.map((treatment) => (
                        <li key={treatment.id}>
                          <span className="font-medium text-slate-900">
                            {treatment.name}
                          </span>
                          {treatment.description ? (
                            <p className="text-slate-500">
                              {treatment.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {selectedRecord.prescription ? (
                <section className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h5 className="text-sm font-semibold text-slate-900">
                      처방전
                    </h5>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {selectedRecord.prescription.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    약국: {selectedRecord.prescription.pharmacyName ?? "미지정"}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {selectedRecord.prescription.medicines.map((medicine) => (
                      <li
                        key={medicine.medicineId}
                        className="rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <strong>{medicine.name}</strong>
                        {medicine.dosage ? (
                          <span className="text-slate-500">
                            {" "}
                            · {medicine.dosage}
                          </span>
                        ) : null}
                        {medicine.frequency ? (
                          <p className="text-slate-500">{medicine.frequency}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <section className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  이 진료 기록에는 등록된 처방전이 없습니다.
                </section>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              환자를 조회하면 진료 기록 상세가 표시됩니다.
            </p>
          )}
        </article>
      </div>

      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </p>
      ) : null}
      {disabled ? (
        <p className="text-sm text-slate-500">
          의사 권한으로 로그인해야 열람할 수 있습니다.
        </p>
      ) : null}
    </section>
  );
}
