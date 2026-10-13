export interface LegalDocumentMetadata {
  id: string;
  number: string;
  title: string;
  issuer: string;
  issuedDate: string;
  effectiveDate: string;
  affectsInformatics: boolean;
  notes: string;
}

export const LEGAL_DOCUMENTS_REGISTRY: ReadonlyArray<LegalDocumentMetadata> = Object.freeze([
  {
    id: 'TT-32-2018',
    number: '32/2018/TT-BGDĐT',
    title: 'Thông tư Ban hành Chương trình giáo dục phổ thông (kèm Chương trình tổng thể và Chương trình môn Tin học)',
    issuer: 'Bộ Giáo dục và Đào tạo',
    issuedDate: '2018-12-26',
    effectiveDate: '2019-02-15',
    affectsInformatics: true,
    notes: 'Văn bản gốc ban hành Chương trình giáo dục phổ thông 2018 và Chương trình môn Tin học cấp THCS (Lớp 6, 7, 8, 9).'
  },
  {
    id: 'TT-20-2021',
    number: '20/2021/TT-BGDĐT',
    title: 'Thông tư sửa đổi, bổ sung Điều 3 Thông tư số 32/2018/TT-BGDĐT',
    issuer: 'Bộ Giáo dục và Đào tạo',
    issuedDate: '2021-07-01',
    effectiveDate: '2021-08-16',
    affectsInformatics: false,
    notes: 'Sửa đổi, bổ sung Điều 3 Thông tư 32/2018/TT-BGDĐT về lộ trình thực hiện chương trình. Hoàn toàn không sửa đổi Yêu cầu cần đạt môn Tin học.'
  },
  {
    id: 'TT-13-2022',
    number: '13/2022/TT-BGDĐT',
    title: 'Thông tư sửa đổi, bổ sung một số nội dung trong Chương trình giáo dục phổ thông ban hành kèm theo Thông tư số 32/2018/TT-BGDĐT',
    issuer: 'Bộ Giáo dục và Đào tạo',
    issuedDate: '2022-08-03',
    effectiveDate: '2022-08-03',
    affectsInformatics: false,
    notes: 'Sửa đổi cấu trúc môn Lịch sử cấp THPT thành môn bắt buộc. Không tác động đến môn Tin học cấp THCS.'
  },
  {
    id: 'TT-17-2025',
    number: '17/2025/TT-BGDĐT',
    title: 'Thông tư sửa đổi, bổ sung một số nội dung của Chương trình giáo dục phổ thông ban hành kèm theo Thông tư số 32/2018/TT-BGDĐT',
    issuer: 'Bộ Giáo dục và Đào tạo',
    issuedDate: '2025-09-12',
    effectiveDate: '2025-09-12',
    affectsInformatics: false,
    notes: 'Sửa đổi, bổ sung đối với môn Lịch sử và Địa lí (cấp TH & THCS), Lịch sử lớp 10, Địa lí THPT, Giáo dục công dân. Hoàn toàn không sửa đổi môn Tin học.'
  }
]);

export interface CurriculumSourceVersionReport {
  baseDocument: string;
  relevantAmendmentsChecked: string[];
  amendmentsAffectingInformatics: string[];
  amendmentsNotAffectingInformatics: string[];
  currentCanonicalBasis: string;
  internalSourceLocatorNote: string;
  asOfDate: string;
}

export function getCurriculumSourceVersionReport(): CurriculumSourceVersionReport {
  const amendments = LEGAL_DOCUMENTS_REGISTRY.filter(d => d.id !== 'TT-32-2018');
  return {
    baseDocument: 'Thông tư số 32/2018/TT-BGDĐT ngày 26/12/2018 của Bộ trưởng Bộ Giáo dục và Đào tạo (Chương trình môn Tin học)',
    relevantAmendmentsChecked: amendments.map(a => `${a.number} (${a.issuedDate}): ${a.title}`),
    amendmentsAffectingInformatics: amendments.filter(a => a.affectsInformatics).map(a => a.number),
    amendmentsNotAffectingInformatics: amendments.filter(a => !a.affectsInformatics).map(a => `${a.number} (${a.notes})`),
    currentCanonicalBasis: 'Chương trình môn Tin học ban hành kèm theo Thông tư số 32/2018/TT-BGDĐT (Nguyên bản có hiệu lực pháp lý)',
    internalSourceLocatorNote: 'sourceLocator dạng TT32/2018-TH{grade}-{topic}-{seq} là INTERNAL CANONICAL SOURCE LOCATOR (mã định vị chuẩn hóa nội bộ của hệ thống), không phải số trang văn bản.',
    asOfDate: '2026-09-27'
  };
}
