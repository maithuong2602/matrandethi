import React from 'react';

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
}

export interface Question {
  id: string;
  content: string;
  subject: string;
  level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
}

export interface MatrixItem {
  topic: string;
  easy: number;
  medium: number;
  hard: number;
  expert: number;
}

// Types for Exercise Creator
export interface ExerciseQuestion {
  id: string;
  category: 'mc' | 'essay';
  level: string; // NB, TH, VD, VDC
  criteria: string;
  content: string;
  image?: string; // Base64 string for image
  // Multiple Choice specific
  mcType?: 'multiple-choice' | 'multiple-answer' | 'fill-blank';
  options?: { id: string; text: string; isCorrect: boolean }[];
  answer?: string; // Stores "A", "B" etc for MC, or text for fill-blank/essay
  // Essay specific
  essayType?: string;
  originalNumber?: string; // for bulk tracking
}

export interface CurriculumData {
  lessonData: Record<string, string[]>;
  criteriaData: Record<string, Record<string, Record<string, string[]>>>;
}

// --- MATRIX SYSTEM TYPES ---

export interface MatrixLevelCount {
  TN: number;
  TL: number;
}

export interface AvailableCounts {
  NB: MatrixLevelCount;
  TH: MatrixLevelCount;
  VD: MatrixLevelCount;
  VDC: MatrixLevelCount;
}

export interface MatrixData {
    matrix: { 
        // [0:STT, 1:Topic, 2:Sub, 3:Label, 4:Count,
        //  5:NB_TN, 6:NB_TL, 7:TH_TN, 8:TH_TL, 9:VD_TN, 10:VD_TL, 11:VDC_TN, 12:VDC_TL,
        //  13:Percent, 14:HasExamined, 15:Note]
        rows: string[][] 
    };
    specifications: { 
        // [0:STT, 1:Main, 2:Sub, 3:Req, 4:NB, 5:TH, 6:VD, 7:VDC]
        rows: string[][] 
    };
    availableCounts: AvailableCounts[];
    normalizedPercentages: Record<string, number>;
    subTopicPercentages: Record<string, number>;
}

// --- IMPORTED MATRIX JSON TYPES ---
export interface ImportedMatrixDetail {
    thongTinChung: {
        stt: string;
        chuong: string;
        noiDung: string;
        bai: string; // Lesson Name to match
        soTiet: number;
        daThi: boolean;
    };
    yeuCauCanDat: string;
    tracNghiem: { NB: number; TH: number; VD: number; VDC: number };
    tuLuan: { NB: number; TH: number; VD: number; VDC: number };
    tiLeDiem: number;
    viTriCauHoi?: {
        NB_TN: string;
        NB_TL: string;
        TH_TN: string;
        TH_TL: string;
        VD_TN: string;
        VD_TL: string;
        VDC_TN: string;
        VDC_TL: string;
    };
}

export interface ImportedMatrixData {
    thongTinChung: { tenDe: string; ngayTao: string };
    chiTiet: ImportedMatrixDetail[];
}

export interface MatrixRow {
    [key: number]: string | number;
    length: number;
}

export interface FileContent {
  info: {
    grade: string;
    lesson: string;
  };
  questions: ExerciseQuestion[];
}

export interface FileSystemItem {
    name: string;
    type: 'folder' | 'file';
    children?: FileSystemItem[]; // Only for folders
    content?: any; // Only for files (JSON content) - can be FileContent
    matrixData?: MatrixData; // Only for folder (Grade/Root folders)
}

export interface DraggedItemInfo {
    name: string;
    type: 'folder' | 'file';
    sourcePath: string[];
}

export interface ToastState {
    message: string;
    type: 'success' | 'error';
    visible: boolean;
}