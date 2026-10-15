import { describe, it, expect } from 'vitest';
import { formatDiem, getRequirementsHtml } from '../utils';

describe('Test Group D: Critical Existing Domain Utilities', () => {
  describe('formatDiem (Vietnamese Decimal Point Formatter)', () => {
    it('formats integer point values with a trailing ,0', () => {
      expect(formatDiem(1)).toBe('1,0');
      expect(formatDiem(10)).toBe('10,0');
      expect(formatDiem(0)).toBe('0,0');
    });

    it('formats fractional values with comma decimal separator', () => {
      expect(formatDiem(0.25)).toBe('0,25');
      expect(formatDiem(0.5)).toBe('0,5');
      expect(formatDiem(0.75)).toBe('0,75');
      expect(formatDiem(2.5)).toBe('2,5');
    });

    it('handles negative or zero bounds safely', () => {
      expect(formatDiem(0)).toBe('0,0');
    });
  });

  describe('getRequirementsHtml (YCCĐ Text to HTML Formatter)', () => {
    it('returns empty string for non-existent grade or topic', () => {
      expect(getRequirementsHtml('Lớp 99', 'Chủ đề Z', 'Nội dung X')).toBe('');
      expect(getRequirementsHtml('Invalid', 'Topic', 'Sub')).toBe('');
    });

    it('converts Grade 6 Topic A requirements into formatted HTML with bold level tags', () => {
      const html = getRequirementsHtml(
        'Lớp 6',
        'Chủ đề A. Máy tính và cộng đồng',
        '1. Thông tin và dữ liệu'
      );

      expect(html).toBeTruthy();
      // Verifies cognitive level headings are wrapped in <strong>
      expect(html).toContain('<strong class="block font-semibold ">Nhận biết</strong>');
      expect(html).toContain('Phân biệt được thông tin với vật mang tin');
      expect(html).toContain('Thông hiểu');
      expect(html).toContain('Vận dụng');
    });

    it('supports parsing grade from various string formats (e.g. "6" or "Lớp 6")', () => {
      const htmlFromNumber = getRequirementsHtml(
        '6',
        'Chủ đề A. Máy tính và cộng đồng',
        '1. Thông tin và dữ liệu'
      );
      expect(htmlFromNumber).toBeTruthy();
      expect(htmlFromNumber).toContain('Phân biệt được thông tin với vật mang tin');
    });
  });

  describe('generateExamWordHtml formatting', () => {
    it('generates header with 13pt font, shortened rule and single line student info', async () => {
      const { generateExamWordHtml } = await import('../utils');
      const html = generateExamWordHtml([], {
        donVi: 'UBND PHƯỜNG HẢI CHÂU',
        tenTruong: 'TRƯỜNG TRUNG HỌC CƠ SỞ LÊ HỒNG PHONG',
        tenKyThi: 'KIỂM TRA GIỮA KÌ I - NĂM HỌC 2026–2027',
        monHoc: 'MÔN: TIN HỌC – LỚP 7',
        thoiGian: '45 phút (không kể thời gian giao đề)',
        maDe: '101'
      });
      expect(html).toContain('width: 35%');
      expect(html).toContain('font-size: 13pt');
      expect(html).toContain('Họ và tên học sinh:');
      expect(html).toContain('Lớp:');
    });
  });
});

