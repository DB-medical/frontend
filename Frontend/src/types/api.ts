export type Role = 'DOCTOR' | 'PHARMACIST';

export type PrescriptionStatus = 'CREATED' | 'RECEIVED' | 'DISPENSING' | 'COMPLETED';

export interface LoginResponse {
  accessToken: string;
  role: Role;
  name: string;
  doctorProfile?: DoctorProfileInfo | null;
}

export interface SignupPayload {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
  role: Role;
  doctorProfile?: {
    hospitalId: string;
    departmentId: string;
  };
  pharmacistProfile?: {
    pharmacyId: string;
  };
}

export interface PatientLookupResponse {
  id?: number;
  name?: string;
  ssn?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
}

export interface PharmacySummary {
  id: number;
  name: string;
  address: string;
  phone?: string;
  hospitalId?: number | null;
  hospitalName?: string | null;
}

export interface PrescriptionSummary {
  prescriptionId: number;
  medicalRecordId: number;
  issueDate: string;
  status: PrescriptionStatus;
  diagnosis: string;
  patient: { id: number; name: string };
  doctor: DoctorSummary;
}

export interface MedicineInfo {
  id?: number;
  name: string;
  manufacturer?: string;
  effect?: string;
  instruction?: string;
}

export interface MedicineSearchResult {
  id: number;
  name: string;
  manufacturer?: string | null;
  efficacy?: string | null;
}

export interface PrescriptionDetail extends PrescriptionSummary {
  pharmacy?: PharmacySummary;
  medicines: Array<MedicineInfo & { dosage?: string }>;
  notes?: string;
}

export interface PersonSummary {
  id: number;
  name: string;
  ssn?: string | null;
  phone?: string | null;
}

export interface DoctorProfileInfo {
  doctorId: number;
  hospitalId?: number | null;
  hospitalName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
}

export interface DoctorSummary {
  id: number;
  name: string;
  hospitalName?: string | null;
  departmentName?: string | null;
}

export interface MedicalRecordSummary {
  recordId: number;
  visitDate: string;
  diagnosis: string;
  patient: PersonSummary;
  doctor: DoctorSummary;
}

export interface MedicalRecordDetail {
  recordId: number;
  visitDate: string;
  diagnosis: string;
  patient: PatientLookupResponse & { id?: number };
  doctor: DoctorSummary;
  symptoms: Array<{
    id: number;
    name: string;
    bodyPart?: string;
  }>;
  treatments: Array<{
    id: number;
    name: string;
    description?: string;
  }>;
  prescription?: {
    id: number;
    issueDate: string;
    status: PrescriptionStatus;
    pharmacyId?: number;
    pharmacyName?: string;
    medicines: Array<{
      medicineId: number;
      name: string;
      manufacturer?: string;
      efficacy?: string;
      dosage?: string;
      frequency?: string;
      days?: number;
      ingredients: Array<{ id: number; name: string }>;
    }>;
  };
}

export interface MedicalRecordPayload {
  visitDate: string;
  diagnosis: string;
  patient: {
    id?: number | null;
    name: string;
    ssn?: string;
    phone?: string;
  };
  symptoms?: Array<{
    id?: number | null;
    name: string;
    bodyPart?: string;
  }>;
  treatments?: Array<{
    id?: number | null;
    name: string;
    description?: string;
  }>;
  prescription?: {
    medicines: Array<{
      medicineId?: number | null;
      name: string;
      dosage?: string;
      instruction?: string;
    }>;
  };
}
