import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import { badgeClass, buttonGhost, buttonPrimary, inputClass, labelClass, panelClass } from './uiStyles';
import type { PharmacySummary, Role } from '../types/api';

interface PharmacySearchPanelProps {
  token: string | null;
  role: Role | null;
}

export function PharmacySearchPanel({ token, role }: PharmacySearchPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<PharmacySummary[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(
    null,
  );
  const [prescriptionId, setPrescriptionId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const disabled = role !== 'DOCTOR' || !token;

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!keyword || disabled) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiRequest<PharmacySummary[]>(
        `/pharmacies?keyword=${encodeURIComponent(keyword)}&size=10`,
        { token },
      );
      setResults(data);
      if (data.length > 0) {
        setSelectedPharmacyId(data[0].id);
      }
      setMessage(`${data.length}개의 약국을 찾았습니다.`);
    } catch (error) {
      const errMessage =
        error instanceof ApiError ? error.message : '약국 검색에 실패했습니다.';
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled || !selectedPharmacyId || !prescriptionId) return;
    setLoading(true);
    setMessage(null);
    try {
      await apiRequest(`/prescriptions/${prescriptionId}/dispatch`, {
        method: 'POST',
        json: { pharmacyId: selectedPharmacyId },
        token,
      });
      setMessage('처방전을 약국으로 전송했습니다.');
      setPrescriptionId('');
    } catch (error) {
      const errMessage =
        error instanceof ApiError
          ? error.message
          : '처방전 전송에 실패했습니다.';
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`${panelClass} gap-6`}>
      <header>
        <p className={badgeClass}>약국 검색</p>
        <h3 className="text-xl font-semibold text-slate-900">키워드 검색 & 처방 전송</h3>
        <p className="text-sm text-slate-500">
          전송 대기(CREATED) 상태의 처방전을 선택한 약국으로 보내면 상태가 접수(RECEIVED)로 바뀝니다.
        </p>
      </header>
      <form className="space-y-3" onSubmit={handleSearch}>
        <label className={labelClass}>
          검색 키워드
          <input
            className={inputClass}
            placeholder="약국 이름 또는 주소"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            disabled={disabled}
          />
        </label>
        <button type="submit" className={buttonGhost} disabled={disabled || loading}>
          {loading ? '검색 중...' : '약국 검색'}
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {results.map((pharmacy) => (
          <button
            key={pharmacy.id}
            type="button"
            className={`rounded-2xl border p-4 text-left transition ${
              selectedPharmacyId === pharmacy.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-200'
            }`}
            onClick={() => setSelectedPharmacyId(pharmacy.id)}
            disabled={disabled}
          >
            <strong className="text-sm text-slate-900">{pharmacy.name}</strong>
            <p className="text-xs text-slate-500">
              소속 병원: {pharmacy.hospitalName ?? '미지정'}
            </p>
            <span className="block text-sm text-slate-600">{pharmacy.address}</span>
            <span className="text-xs text-slate-500">{pharmacy.phone}</span>
          </button>
        ))}
        {results.length === 0 ? <p className="text-sm text-slate-500">검색 결과가 여기에 표시됩니다.</p> : null}
      </div>

      <form className="space-y-3" onSubmit={handleDispatch}>
        <label className={labelClass}>
          전송할 처방전 ID
          <input
            className={inputClass}
            value={prescriptionId}
            onChange={(event) => setPrescriptionId(event.target.value)}
            disabled={disabled || !selectedPharmacyId}
            placeholder="예: 12"
          />
        </label>
        <button
          type="submit"
          className={buttonPrimary}
          disabled={disabled || loading || !selectedPharmacyId || !prescriptionId}
        >
          {loading ? '전송 중...' : '선택한 약국으로 전송'}
        </button>
      </form>

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {disabled ? <p className="text-sm text-slate-500">의사 권한 로그인 후 사용 가능합니다.</p> : null}
    </section>
  );
}
