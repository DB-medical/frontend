import { useEffect, useMemo, useState } from "react";
import { apiRequest, ApiError } from "../lib/api";
import { badgeClass, buttonGhost, inputClass, panelClass } from "./uiStyles";
import type {
  MedicalRecordDetail,
  MedicalRecordSummary,
  Role,
} from "../types/api";

interface AllRecordsPanelProps {
  token: string | null;
  role: Role | null;
}

export function AllRecordsPanel({ token, role }: AllRecordsPanelProps) {
  const [records, setRecords] = useState<MedicalRecordSummary[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<
    MedicalRecordSummary[]
  >([]);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] =
    useState<MedicalRecordDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const disabled = role !== "DOCTOR" || !token;

  const loadRecords = async () => {
    if (disabled) return;
    setLoading(true);
    setMessage(null);
    try {
      const list = await apiRequest<MedicalRecordSummary[]>(
        "/medical-records",
        {
          token,
        }
      );
      setRecords(list);
      setFilteredRecords(list);
      if (list.length > 0) {
        await selectRecord(list[0].recordId);
      } else {
        setSelectedRecord(null);
        setSelectedRecordId(null);
      }
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : "진료 기록을 불러오지 못했습니다.";
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && role === "DOCTOR") {
      void loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

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

  useEffect(() => {
    if (!search) {
      setFilteredRecords(records);
      return;
    }
    const keyword = search.toLowerCase();
    setFilteredRecords(
      records.filter(
        (record) =>
          record.patient.name.toLowerCase().includes(keyword) ||
          record.diagnosis.toLowerCase().includes(keyword)
      )
    );
  }, [search, records]);

  const emptyState = useMemo(
    () => filteredRecords.length === 0 && !loading,
    [filteredRecords.length, loading]
  );

  return (
    <section className={`${panelClass} gap-6`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={badgeClass}>전체 진료 기록</p>
          <h3 className="text-xl font-semibold text-slate-900">
            의무기록 열람
          </h3>
        </div>
        <button
          type="button"
          className={buttonGhost}
          onClick={loadRecords}
          disabled={disabled || loading}
        >
          새로고침
        </button>
      </header>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">
          환자명/진단 검색
          <input
            className={`${inputClass} mt-1`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="예: 김하늘 또는 상기도"
            disabled={disabled}
          />
        </label>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="space-y-3 lg:w-72">
          {emptyState ? (
            <p className="text-sm text-slate-500">
              표시할 진료 기록이 없습니다.
            </p>
          ) : null}
          {filteredRecords.map((record) => (
            <button
              type="button"
              key={record.recordId}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selectedRecordId === record.recordId
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-700 hover:border-indigo-200"
              }`}
              onClick={() => selectRecord(record.recordId)}
              disabled={disabled}
            >
              <strong className="block text-sm">{record.patient.name}</strong>
              <span className="block text-sm text-slate-500">
                {record.diagnosis}
              </span>
              <span className="text-xs text-slate-400">{record.visitDate}</span>
            </button>
          ))}
        </aside>

        <article className="flex-1 rounded-2xl border border-slate-200 p-5">
          {selectedRecord ? (
            <>
              <header className="border-b border-dashed border-slate-200 pb-4 space-y-1">
                <p className={badgeClass}>진단명</p>
                <h4 className="text-2xl font-semibold text-slate-900">
                  {selectedRecord.diagnosis}
                </h4>
                <p className="text-sm text-slate-500">
                  진료일 {selectedRecord.visitDate}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">
                    담당의 {selectedRecord.doctor.name}
                  </span>
                  {selectedRecord.doctor.departmentName ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {selectedRecord.doctor.departmentName} ·{" "}
                      {selectedRecord.doctor.hospitalName ?? "-"}
                    </span>
                  ) : null}
                </div>
              </header>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                    환자
                  </p>
                  <p className="text-sm text-slate-800">
                    {selectedRecord.patient.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                    의사
                  </p>
                  <p className="text-sm text-slate-800">
                    {selectedRecord.doctor.name}
                  </p>
                  {selectedRecord.doctor.departmentName ? (
                    <span className="text-xs text-slate-500">
                      {selectedRecord.doctor.departmentName} ·{" "}
                      {selectedRecord.doctor.hospitalName ?? "-"}
                    </span>
                  ) : null}
                </div>
              </div>
              <section className="mt-4 space-y-2">
                <h5 className="text-sm font-semibold text-slate-900">증상</h5>
                <ul className="space-y-1 text-sm text-slate-700">
                  {selectedRecord.symptoms.map((symptom) => (
                    <li key={symptom.id}>
                      <strong>{symptom.name}</strong>
                      {symptom.bodyPart ? (
                        <span className="text-slate-500">
                          {" "}
                          · {symptom.bodyPart}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="mt-4 space-y-2">
                <h5 className="text-sm font-semibold text-slate-900">치료</h5>
                <ul className="space-y-1 text-sm text-slate-700">
                  {selectedRecord.treatments.map((treatment) => (
                    <li key={treatment.id}>
                      <strong>{treatment.name}</strong>
                      {treatment.description ? (
                        <p className="text-slate-500">
                          {treatment.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
              {selectedRecord.prescription ? (
                <section className="mt-4 space-y-2">
                  <h5 className="text-sm font-semibold text-slate-900">
                    처방전
                  </h5>
                  <p className="text-sm text-slate-500">
                    상태: {selectedRecord.prescription.status} · 약국:{" "}
                    {selectedRecord.prescription.pharmacyName ?? "미지정"}
                  </p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {selectedRecord.prescription.medicines.map((medicine) => (
                      <li key={medicine.medicineId}>
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
              ) : null}
            </>
          ) : (
            <p className="text-sm text-slate-500">
              좌측 목록에서 진료 기록을 선택하세요.
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
          의사 권한으로 로그인해야 전체 진료 기록을 확인할 수 있습니다.
        </p>
      ) : null}
    </section>
  );
}
