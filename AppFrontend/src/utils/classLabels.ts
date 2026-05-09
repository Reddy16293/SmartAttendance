export type SubjectLike = {
  id?: number | string;
  name?: string | null;
  code?: string | null;
  subject_name?: string | null;
  subject_code?: string | null;
  subjectName?: string | null;
  subjectCode?: string | null;
};

export type ClassLike = {
  subject_id?: number | string | null;
  subject_name?: string | SubjectLike | null;
  subject_code?: string | SubjectLike | null;
  subjectName?: string | SubjectLike | null;
  subjectCode?: string | SubjectLike | null;
  subject?: string | SubjectLike | null;
  name?: string | null;
  code?: string | null;
};

export function normalizeId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveLabel(value: unknown, fallback = 'Unknown Subject'): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object') {
    const subject = value as SubjectLike;
    return (
      subject.name ||
      subject.subject_name ||
      subject.subjectName ||
      subject.code ||
      subject.subject_code ||
      subject.subjectCode ||
      fallback
    );
  }

  return fallback;
}

export function resolveClassSubjectName(classItem: ClassLike, subjectLookup?: Map<number, SubjectLike>): string {
  const directSubject = classItem.subject_name ?? classItem.subjectName ?? classItem.subject;
  const directName = resolveLabel(directSubject, '');
  if (directName) return directName;

  const subjectId = normalizeId(classItem.subject_id);
  if (subjectId !== null && subjectLookup?.has(subjectId)) {
    return resolveLabel(subjectLookup.get(subjectId), 'Unknown Subject');
  }

  return resolveLabel(classItem.name, 'Unknown Subject');
}

export function resolveClassSubjectCode(classItem: ClassLike, subjectLookup?: Map<number, SubjectLike>): string {
  const directCode = classItem.subject_code ?? classItem.subjectCode;
  const directLabel = resolveLabel(directCode, '');
  if (directLabel) return directLabel;

  const subjectId = normalizeId(classItem.subject_id);
  if (subjectId !== null && subjectLookup?.has(subjectId)) {
    return resolveLabel(subjectLookup.get(subjectId)?.code, 'N/A');
  }

  return resolveLabel(classItem.code, 'N/A');
}