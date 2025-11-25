import { useEffect, useMemo, useState } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import { badgeClass, buttonGhost, buttonPrimary, panelClass } from './uiStyles';
import type { PrescriptionDetail, PrescriptionStatus, PrescriptionSummary, Role } from '../types/api';

interface PrescriptionsPanelProps {
  token: string | null;
  role: Role | null;
  onStatusUpdated?: () => void;
}

const pharmacistStatusSteps: PrescriptionStatus[] = ['RECEIVED', 'DISPENSING', 'COMPLETED'];

function getNextStatus(current: PrescriptionStatus): PrescriptionStatus | null {
  const currentIndex = pharmacistStatusSteps.indexOf(current);
  if (currentIndex === -1) return null;
  return pharmacistStatusSteps[currentIndex + 1] ?? null;
}

export function PrescriptionsPanel({ token, role, onStatusUpdated }: PrescriptionsPanelProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PrescriptionDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const disabled = !token;

  const loadPrescriptions = async () => {
    if (disabled) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiRequest<PrescriptionSummary[]>('/prescriptions', {
        token,
      });
      setPrescriptions(data);
      if (data.length === 0) {
        setSelectedDetail(null);
        setSelectedId(null);
        return;
      }
      if (selectedId === null) {
        await selectPrescription(data[0].prescriptionId);
        return;
      }
      const exists = data.some((item) => item.prescriptionId === selectedId);
      if (!exists) {
        await selectPrescription(data[0].prescriptionId);
      }
    } catch (error) {
      const errMessage =
        error instanceof ApiError ? error.message : '처방전을 불러오지 못했습니다.';
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectPrescription = async (id: number) => {
    setSelectedId(id);
    if (disabled) return;
    try {
      const detail = await apiRequest<PrescriptionDetail>(`/prescriptions/${id}`, {
        token,
      });
      setSelectedDetail(detail);
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : '처방전 상세를 불러오지 못했습니다.';
      setMessage(errMessage);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!selectedDetail || disabled || role !== 'PHARMACIST') return;
    const nextStatus = getNextStatus(selectedDetail.status);
    if (!nextStatus) {
      setMessage('완료된 처방전은 더 이상 변경할 수 없습니다.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await apiRequest(`/prescriptions/${selectedDetail.prescriptionId}/status`, {
        method: 'PATCH',
        json: { status: nextStatus },
        token,
      });
      await selectPrescription(selectedDetail.prescriptionId);
      await loadPrescriptions();
      setMessage('상태가 업데이트되었습니다.');
      onStatusUpdated?.();
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : '상태 업데이트에 실패했습니다.';
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void loadPrescriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  const statusText = (status: PrescriptionStatus) => {
    switch (status) {
      case 'CREATED':
        return '전송 대기';
      case 'RECEIVED':
        return '접수';
      case 'DISPENSING':
        return '조제 중';
      case 'COMPLETED':
        return '완료';
      default:
        return status;
    }
  };

  const statusLabel = useMemo(() => (selectedDetail ? statusText(selectedDetail.status) : ''), [selectedDetail]);

  const statusBadgeClass = (status: PrescriptionStatus) => {
    switch (status) {
      case 'CREATED':
        return 'bg-violet-100 text-violet-700';
      case 'RECEIVED':
        return 'bg-blue-100 text-blue-700';
      case 'DISPENSING':
        return 'bg-amber-100 text-amber-700';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <section className={`${panelClass} gap-6`}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={badgeClass}>처방전</p>
          <h3 className="text-xl font-semibold text-slate-900">목록 · 상세 · 상태 변경</h3>
          <p className="text-sm text-slate-500">
            의사는 자신이 작성한 처방을, 약사는 본인 약국으로 온 처방을 확인합니다.
          </p>
        </div>
        <button type="button" className={buttonGhost} onClick={loadPrescriptions} disabled={disabled || loading}>
          새로고침
        </button>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="space-y-3 lg:w-72">
          {prescriptions.map((prescription) => (
            <button
              type="button"
              key={prescription.prescriptionId}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selectedId === prescription.prescriptionId
                  ? 'border-rose-300 bg-rose-50'
                  : 'border-slate-200 hover:border-rose-200'
              }`}
              onClick={() => selectPrescription(prescription.prescriptionId)}
              disabled={disabled}
            >
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-sm text-slate-900">{prescription.patient.name}</strong>
                  <p className="text-[11px] text-slate-400">#{prescription.prescriptionId}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(prescription.status)}`}>
                  {statusText(prescription.status)}
                </span>
              </div>
              <p className="text-xs text-slate-500">{prescription.diagnosis}</p>
              <span className="text-[11px] text-slate-400">{prescription.issueDate}</span>
            </button>
          ))}
          {prescriptions.length === 0 ? (
            <p className="text-sm text-slate-500">처방전이 없습니다. 새로고침으로 다시 시도하세요.</p>
          ) : null}
        </aside>

        <article className="flex-1 rounded-2xl border border-slate-200 p-5">
          {selectedDetail ? (
            <>
              <header className="flex items-center justify-between">
                <div>
                  <p className={badgeClass}>상태</p>
                  <h4 className="text-xl font-semibold text-slate-900">{statusLabel}</h4>
                  <p className="text-xs text-slate-500">처방전 ID: {selectedDetail.prescriptionId}</p>
                </div>
                {role === 'PHARMACIST' ? (
                  <button
                    type="button"
                    className={buttonPrimary}
                    onClick={handleAdvanceStatus}
                    disabled={disabled || loading || !getNextStatus(selectedDetail.status)}
                  >
                    {getNextStatus(selectedDetail.status)
                      ? `→ ${getNextStatus(selectedDetail.status)}`
                      : '완료'}
                  </button>
                ) : null}
              </header>
              {selectedDetail.status === 'CREATED' ? (
                <p className="mt-2 rounded-xl border border-dashed border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
                  약국으로 전송되지 않은 처방전입니다. 의사 워크스페이스의 ‘약국 검색/전송’ 탭에서 약국을 지정하세요.
                </p>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">환자</p>
                  <p className="text-sm text-slate-900">{selectedDetail.patient.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">의사</p>
                  <p className="text-sm text-slate-900">{selectedDetail.doctor.name}</p>
                  {selectedDetail.doctor.departmentName ? (
                    <span className="text-xs text-slate-500">
                      {selectedDetail.doctor.departmentName} · {selectedDetail.doctor.hospitalName ?? '-'}
                    </span>
                  ) : null}
                </div>
                {selectedDetail.pharmacy ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">약국</p>
                    <p className="text-sm text-slate-900">{selectedDetail.pharmacy.name}</p>
                    <small className="text-xs text-slate-500">{selectedDetail.pharmacy.address}</small>
                  </div>
                ) : null}
              </div>

              <section className="mt-4 space-y-2">
                <h5 className="text-sm font-semibold text-slate-900">약품 정보</h5>
                <ul className="space-y-1 text-sm text-slate-700">
                  {selectedDetail.medicines.map((medicine, index) => (
                    <li key={`${medicine.name}-${index}`}>
                      <strong>{medicine.name}</strong>
                      {medicine.dosage ? <span className="text-slate-500"> · {medicine.dosage}</span> : null}
                      {medicine.instruction ? <p className="text-slate-500">{medicine.instruction}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <p className="text-sm text-slate-500">좌측에서 처방전을 선택하면 상세가 표시됩니다.</p>
          )}
        </article>
      </div>
      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </p>
      ) : null}
      {disabled ? <p className="text-sm text-slate-500">로그인 후 처방전 목록을 확인하세요.</p> : null}
    </section>
  );
}
