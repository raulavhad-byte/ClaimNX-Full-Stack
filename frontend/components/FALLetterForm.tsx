import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Download,
  Calculator,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
} from "lucide-react";
import { Claim, HospitalUser, PatientDocument } from "../types";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface FALLineItem {
  id: string;
  description: string;
  billAmount: number;
  amountDeducted: number;
  admissibleAmount: number;
  deductionReason: string;
}

export interface FALLetterData {
  items: FALLineItem[];
  summary: {
    totalBillAmount: number;
    otherDeductions: number;
    discount: number;
    admissibleAmount: number;
    coPayPercent: number;
    coPayAmount: number;
    deductibles: number;
    totalAssessmentAmount: number;
    paidByPatient: number;
  };
  patientDetails: {
    patientName: string;
    billNo: string;
    tpa: string;
    age: string;
    insuranceCompany: string;
    gender: string;
    roomCategory: string;
    admissionDate: string;
    finalDiagnosis: string;
    dischargeDate: string;
    hospitalName: string;
    patientCategory: string;
  };
  status: "Draft" | "Submitted";
  submittedAt?: string;
  pdfBase64?: string;
}

interface FALLetterFormProps {
  claim: Claim;
  hospital?: HospitalUser;
  patientDocs?: PatientDocument[];
  onUpdate: (falData: FALLetterData, isSubmit: boolean) => void;
  onClose: () => void;
}

const FALLetterForm: React.FC<FALLetterFormProps> = ({
  claim,
  hospital,
  patientDocs = [],
  onUpdate,
  onClose,
}) => {
  const [items, setItems] = useState<FALLineItem[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    patientDocs.map((d) => d.id)
  );
  
  const visibleDocs = useMemo(() => {
    return patientDocs.filter((d) => selectedDocIds.includes(d.id));
  }, [patientDocs, selectedDocIds]);

  const [activeDocIndex, setActiveDocIndex] = useState(0);

  // Keep activeDocIndex clean when selection changes
  useEffect(() => {
    if (activeDocIndex >= visibleDocs.length && visibleDocs.length > 0) {
      setActiveDocIndex(visibleDocs.length - 1);
    }
  }, [visibleDocs.length, activeDocIndex]);
  const [summary, setSummary] = useState({
    totalBillAmount: 0,
    otherDeductions: 0,
    discount: 0,
    admissibleAmount: 0,
    coPayPercent: 0,
    coPayAmount: 0,
    deductibles: 0,
    totalAssessmentAmount: 0,
    paidByPatient: 0,
  });

  const [patientDetails, setPatientDetails] = useState({
    patientName: claim.patientName || "",
    billNo:
      claim.formData?.bill_no || "IPD/" + new Date().getFullYear() + "/0001",
    tpa: claim.formData?.tpa_provider || "In House",
    age: claim.formData?.p_age || "",
    insuranceCompany: claim.insuranceProvider || "",
    gender: claim.formData?.p_gender || "",
    roomCategory: claim.formData?.room_category || "General",
    admissionDate: claim.admissionDate || "",
    finalDiagnosis: claim.diagnosis || "",
    dischargeDate: claim.formData?.discharge_date || "",
    hospitalName: hospital?.hospitalName || "",
    patientCategory: "Reimbursement",
  });

  // Initialize data from claim if it already exists
  useEffect(() => {
    if (claim.formData?.falLetterData) {
      const savedData = claim.formData.falLetterData as FALLetterData;
      setItems(savedData.items || []);
      setSummary(
        savedData.summary || {
          totalBillAmount: 0,
          otherDeductions: 0,
          discount: 0,
          admissibleAmount: 0,
          coPayPercent: 0,
          coPayAmount: 0,
          deductibles: 0,
          totalAssessmentAmount: 0,
          paidByPatient: 0,
        },
      );
      if (savedData.patientDetails) {
        setPatientDetails({
          ...patientDetails,
          ...savedData.patientDetails,
        });
      }
    } else {
      // Default items
      setItems([
        {
          id: "1",
          description: "Room Rent",
          billAmount: 0,
          amountDeducted: 0,
          admissibleAmount: 0,
          deductionReason: "NA",
        },
        {
          id: "2",
          description: "RMO & Nursing Charges",
          billAmount: 0,
          amountDeducted: 0,
          admissibleAmount: 0,
          deductionReason: "",
        },
        {
          id: "3",
          description: "Professional Fees (Surgeon, etc)",
          billAmount: 0,
          amountDeducted: 0,
          admissibleAmount: 0,
          deductionReason: "",
        },
        {
          id: "4",
          description: "Investigation & Diagnostics",
          billAmount: 0,
          amountDeducted: 0,
          admissibleAmount: 0,
          deductionReason: "",
        },
        {
          id: "5",
          description: "Medicines and Consumables",
          billAmount: 0,
          amountDeducted: 0,
          admissibleAmount: 0,
          deductionReason: "",
        },
        {
          id: "6",
          description: "Others Charges",
          billAmount: 0,
          amountDeducted: 0,
          admissibleAmount: 0,
          deductionReason: "",
        },
      ]);
    }
  }, [claim]);

  // Recalculate summary whenever items or percentages change
  useEffect(() => {
    const totalBill = items.reduce(
      (sum, item) => sum + (Number(item.billAmount) || 0),
      0,
    );
    const totalDeducted = items.reduce(
      (sum, item) => sum + (Number(item.amountDeducted) || 0),
      0,
    );
    const admissible = totalBill - totalDeducted;

    // Summary calculations
    const coPayAmt = (admissible * (Number(summary.coPayPercent) || 0)) / 100;
    const finalAssessment =
      admissible - coPayAmt - (Number(summary.deductibles) || 0);
    const paidByPatient = totalBill - finalAssessment;

    setSummary((prev) => ({
      ...prev,
      totalBillAmount: totalBill,
      otherDeductions: totalDeducted,
      admissibleAmount: admissible,
      coPayAmount: coPayAmt,
      totalAssessmentAmount: finalAssessment,
      paidByPatient: paidByPatient,
    }));
  }, [items, summary.coPayPercent, summary.deductibles]);

  const addItem = () => {
    const newId = (items.length + 1).toString();
    setItems([
      ...items,
      {
        id: newId,
        description: "",
        billAmount: 0,
        amountDeducted: 0,
        admissibleAmount: 0,
        deductionReason: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof FALLineItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "billAmount" || field === "amountDeducted") {
            updated.admissibleAmount =
              (Number(updated.billAmount) || 0) -
              (Number(updated.amountDeducted) || 0);
          }
          return updated;
        }
        return item;
      }),
    );
  };

  const generatePDFDoc = () => {
    const doc = new jsPDF() as any;

    // Add Logo placeholder
    doc.setFontSize(20);
    doc.setTextColor(180, 0, 0);
    doc.text("BIMA GARAGE", 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Assessment Letter", 105, 15, { align: "center" });
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("HobNob", 170, 15);

    // Patient Details Header
    const patientData = [
      [
        `Patient Name :-`,
        patientDetails.patientName,
        `Bill No:-`,
        patientDetails.billNo,
      ],
      [`TPA :-`, patientDetails.tpa, `Age :-`, patientDetails.age],
      [
        `Insurance Company :-`,
        patientDetails.insuranceCompany,
        `Gender :-`,
        patientDetails.gender,
      ],
      [
        `Room Category :-`,
        patientDetails.roomCategory,
        `Admission Date`,
        patientDetails.admissionDate,
      ],
      [
        `Final Diagnosis :-`,
        patientDetails.finalDiagnosis,
        `Discharge Date`,
        patientDetails.dischargeDate,
      ],
      [
        `Hospital Name`,
        patientDetails.hospitalName,
        `Patient Category`,
        patientDetails.patientCategory,
      ],
    ];

    (autoTable as any)(doc, {
      startY: 20,
      body: patientData,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: "bold", width: 35 },
        1: { width: 60 },
        2: { fontStyle: "bold", width: 35 },
        3: { width: 60 },
      },
    });

    // Deduction Details Table
    const tableHeaders = [
      [
        "S.No",
        "Description",
        "Bill Amount",
        "Amount Deducted",
        "Admissible Amount",
        "Deduction Reason",
      ],
    ];
    const tableRows = items.map((item) => [
      item.id,
      item.description,
      item.billAmount.toLocaleString(),
      item.amountDeducted.toLocaleString(),
      item.admissibleAmount.toLocaleString(),
      item.deductionReason || "NA",
    ]);
    tableRows.push([
      "",
      "Total",
      summary.totalBillAmount.toLocaleString(),
      summary.otherDeductions.toLocaleString(),
      summary.admissibleAmount.toLocaleString(),
      "",
    ]);

    (autoTable as any)(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 5 : 70,
      styles: { fontSize: 8 },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      didParseCell: (data: any) => {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [245, 245, 245];
        }
      },
    });

    // Assessment Summary
    const summaryHeader = [["Assessment Summary", ""]];
    const summaryRows = [
      ["Total Bill Amount :", `Rs. ${summary.totalBillAmount.toLocaleString()}`],
      ["Other Deductions :", `Rs. ${summary.otherDeductions.toLocaleString()}`],
      ["Discount :", `Rs. ${summary.discount.toLocaleString()}`],
      ["Admissible Amount :", `Rs. ${summary.admissibleAmount.toLocaleString()}`],
      [
        `Co-pay (${summary.coPayPercent}%) :`,
        `Rs. ${summary.coPayAmount.toLocaleString()}`,
      ],
      ["Deductibles :", `Rs. ${summary.deductibles.toLocaleString()}`],
      [
        "Total Assessment Amount :",
        `Rs. ${summary.totalAssessmentAmount.toLocaleString()}`,
      ],
      ["Paid by Patient :", `Rs. ${summary.paidByPatient.toLocaleString()}`],
    ];

    (autoTable as any)(doc, {
      head: summaryHeader,
      body: summaryRows,
      startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 150,
      margin: { left: 14, right: 100 },
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 65 },
        1: { halign: "right", cellWidth: 31 },
      },
      didParseCell: (data: any) => {
        if (data.row.raw && data.row.raw[0] && data.row.raw[0].includes("Total Assessment Amount")) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [225, 29, 72]; // Rose-600 color to match the "PREPARE NEW ASSESSMENT" button
          data.cell.styles.textColor = [255, 255, 255]; // High contrast white text
        }
      },
    });

    // Footer
    const footerY = ((doc as any).lastAutoTable?.finalY || 250) + 20;
    doc.setFontSize(8);
    doc.text(
      "This letter is issued on request and in agreement of our partner hospital for their internal assessment and financial decision.",
      14,
      footerY,
    );

    return doc;
  };

  const handleSave = (isSubmit: boolean) => {
    let pdfBase64 = "";
    if (isSubmit) {
      try {
        const doc = generatePDFDoc();
        const fullBase64 = doc.output('datauristring');
        pdfBase64 = fullBase64.includes(',') ? fullBase64.split(',')[1] : fullBase64;
      } catch (err) {
        console.error("Failed to pre-render FAL PDF base64:", err);
      }
    }

    const falData: FALLetterData = {
      items,
      summary,
      patientDetails,
      status: isSubmit ? "Submitted" : "Draft",
      submittedAt: isSubmit ? new Date().toISOString() : undefined,
      pdfBase64: pdfBase64 || undefined,
    };
    onUpdate(falData, isSubmit);
  };

  const downloadPDF = () => {
    try {
      const doc = generatePDFDoc();
      doc.save(`FAL_Letter_${claim.patientName}_${claim.id}.pdf`);
      toast.success("FAL Letter downloaded successfully.");
    } catch (err) {
      toast.error("Failed to download FAL PDF.");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-slate-950 overflow-hidden animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all rounded-xl border border-white/5 mr-2"
          >
            <ChevronLeft size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Back
            </span>
          </button>
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-900/20">
            <FileText className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Bima Garage | Final Assessment
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {claim.patientName} | {claim.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {claim.formData?.falLetterData?.status === "Submitted" && (
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-lg shadow-rose-900/20"
            >
              <Download size={14} /> Download PDF
            </button>
          )}
          <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
            <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
              Status:
            </span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">
              {claim.formData?.falLetterData?.status || "Draft"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-500 hover:text-white hover:bg-white/10 transition-all rounded-xl border border-transparent hover:border-white/10"
          >
            <AlertCircle size={20} />
          </button>
        </div>
      </div>

      {/* Main Content: Dual Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Document Viewer */}
        <div className="w-1/2 bg-slate-900 border-r border-slate-800 flex flex-col relative group">
          {visibleDocs.length > 0 ? (
            <>
              <div className="flex-1 p-8 flex items-center justify-center bg-[#1e1e1e] relative overflow-hidden">
                {visibleDocs[activeDocIndex].fileData.includes("pdf") ? (
                  <iframe
                    src={visibleDocs[activeDocIndex].fileData}
                    className="w-full h-full rounded-lg shadow-2xl border border-white/5"
                    title="Final Bill Viewer"
                  />
                ) : (
                  <img
                    src={visibleDocs[activeDocIndex].fileData}
                    alt="Patient Document"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-4xl hover:scale-[1.02] transition-transform duration-500"
                  />
                )}

                {/* Floating Navigation Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() =>
                      setActiveDocIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={activeDocIndex === 0}
                    className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30"
                  >
                    <Trash2 size={16} className="rotate-90" />
                  </button>
                  <div className="px-4 border-x border-white/10">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest text-center">
                      Document {activeDocIndex + 1} of {visibleDocs.length}
                    </p>
                    <p className="text-[8px] font-bold text-rose-400 uppercase tracking-[0.2em] truncate max-w-[120px]">
                      {visibleDocs[activeDocIndex].fileName}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setActiveDocIndex((prev) =>
                        Math.min(visibleDocs.length - 1, prev + 1),
                      )
                    }
                    disabled={activeDocIndex === visibleDocs.length - 1}
                    className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Thumbnails Strip */}
              <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center gap-3 px-4 overflow-x-auto shrink-0 scrollbar-hide">
                {patientDocs.map((doc, idx) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  const isViewerActive = visibleDocs[activeDocIndex]?.id === doc.id;
                  
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        if (isSelected) {
                          const newIdx = visibleDocs.findIndex((d) => d.id === doc.id);
                          if (newIdx !== -1) {
                            setActiveDocIndex(newIdx);
                          }
                        } else {
                          setSelectedDocIds((prev) => [...prev, doc.id]);
                          const futureDocs = [...visibleDocs, doc];
                          const newIdx = futureDocs.findIndex((d) => d.id === doc.id);
                          if (newIdx !== -1) {
                            setActiveDocIndex(newIdx);
                          }
                        }
                      }}
                      className={`w-16 h-16 rounded-xl border-2 shrink-0 transition-all overflow-hidden relative ${
                        isViewerActive
                          ? "border-rose-500 scale-105 shadow-lg shadow-rose-500/20"
                          : isSelected
                          ? "border-slate-700 opacity-95"
                          : "border-slate-800 opacity-40 grayscale hover:grayscale-0 hover:opacity-80"
                      }`}
                    >
                      {doc.fileData.includes("pdf") ? (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <FileText className="text-slate-500" size={24} />
                        </div>
                      ) : (
                        <img
                          src={doc.fileData}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      )}

                      {/* Selection Checkbox Overlay */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocIds((prev) => {
                            const isIncluded = prev.includes(doc.id);
                            if (isIncluded) {
                              return prev.filter((id) => id !== doc.id);
                            } else {
                              return [...prev, doc.id];
                            }
                          });
                        }}
                        className={`absolute top-1 right-1 w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? "bg-rose-500 border-rose-400 text-white"
                            : "bg-slate-900/80 border-slate-600 hover:bg-slate-800"
                        }`}
                        title={isSelected ? "Deselect document" : "Select document"}
                      >
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 border border-slate-700">
                <FileText className="text-slate-600" size={32} />
              </div>
              <h4 className="text-white font-black uppercase tracking-widest mb-2">
                No Selected Documents
              </h4>
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                Please select at least one document from the thumbnails strip or upload the Final Bill/medical records to view.
              </p>
              
              {/* Reset Selection Button if patientDocs exist */}
              {patientDocs.length > 0 && (
                <button
                  onClick={() => setSelectedDocIds(patientDocs.map((d) => d.id))}
                  className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition"
                >
                  Select All Documents
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Pane: Form Entry */}
        <div className="w-1/2 bg-white flex flex-col">
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-12">
              {/* branding header section */}
              <div className="flex items-center justify-between pb-8 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-rose-100">
                    BG
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                      BIMA GARAGE
                    </h2>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mt-0.5">
                      Final Assessment Division
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Date Generated
                  </span>
                  <p className="text-xs font-black text-slate-800 mt-1">
                    {new Date()
                      .toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                      .toUpperCase()}
                  </p>
                </div>
              </div>
              {/* Patient Header Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Entry Section 01: Identity
                  </span>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <DetailInput
                    label="Patient Name"
                    value={patientDetails.patientName}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, patientName: v })
                    }
                  />
                  <DetailInput
                    label="Bill No"
                    value={patientDetails.billNo}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, billNo: v })
                    }
                  />
                  <DetailInput
                    label="TPA"
                    value={patientDetails.tpa}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, tpa: v })
                    }
                  />
                  <DetailInput
                    label="Age"
                    value={patientDetails.age}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, age: v })
                    }
                  />
                  <DetailInput
                    label="Insurance Company"
                    value={patientDetails.insuranceCompany}
                    onChange={(v: string) =>
                      setPatientDetails({
                        ...patientDetails,
                        insuranceCompany: v,
                      })
                    }
                  />
                  <DetailInput
                    label="Gender"
                    value={patientDetails.gender}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, gender: v })
                    }
                  />
                  <DetailInput
                    label="Admission Date"
                    type="date"
                    value={patientDetails.admissionDate}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, admissionDate: v })
                    }
                  />
                  <DetailInput
                    label="Discharge Date"
                    type="date"
                    value={patientDetails.dischargeDate}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, dischargeDate: v })
                    }
                  />
                  <DetailInput
                    label="Room Category"
                    value={patientDetails.roomCategory}
                    onChange={(v: string) =>
                      setPatientDetails({ ...patientDetails, roomCategory: v })
                    }
                  />
                </div>
              </div>
              {/* Items Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Entry Section 02: Billing Details
                    </span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="group bg-slate-50 border border-slate-200 rounded-3xl p-5 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(item.id, "description", e.target.value)
                            }
                            placeholder="Description (e.g., Room Rent)"
                            className="bg-transparent border-none p-0 text-sm font-black text-slate-800 placeholder:text-slate-300 focus:ring-0 outline-none w-64"
                          />
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Bill Amt
                          </label>
                          <input
                            type="number"
                            value={item.billAmount || ""}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "billAmount",
                                Number(e.target.value),
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Deducted
                          </label>
                          <input
                            type="number"
                            value={item.amountDeducted || ""}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "amountDeducted",
                                Number(e.target.value),
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-rose-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Reason
                          </label>
                          <input
                            type="text"
                            value={item.deductionReason}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "deductionReason",
                                e.target.value,
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500"
                            placeholder="NA"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addItem}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add Custom Line Item
                  </button>
                </div>
              </div>
              {/* Assessment Summary */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Entry Section 03: Summary
                  </span>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    <SummaryInput
                      label="Discount"
                      value={summary.discount}
                      onChange={(v) => setSummary({ ...summary, discount: v })}
                    />
                    <SummaryInput
                      label="Deductibles"
                      value={summary.deductibles}
                      onChange={(v) =>
                        setSummary({ ...summary, deductibles: v })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Co-pay Percentage
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={summary.coPayPercent || ""}
                          onChange={(e) =>
                            setSummary({
                              ...summary,
                              coPayPercent: Number(e.target.value),
                            })
                          }
                          className="w-12 text-lg font-black text-indigo-600 border-none p-0 focus:ring-0 outline-none"
                        />
                        <span className="text-lg font-black text-slate-300">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Co-pay Amount
                      </span>
                      <p className="text-lg font-black text-slate-800">
                        ₹{summary.coPayAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-[2rem] text-white flex items-center justify-between shadow-2xl">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        Final Assessment
                      </span>
                      <p className="text-3xl font-black mt-2 tracking-tight">
                        ₹{summary.totalAssessmentAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Paid by Patient
                      </span>
                      <p className="text-xl font-black text-amber-500 mt-2">
                        ₹{summary.paidByPatient.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-32"></div> {/* Spacer for bottom bar */}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="h-24 bg-white border-t border-slate-100 flex items-center justify-between px-10 relative z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Admissible
                </span>
                <span className="text-xl font-black text-emerald-600">
                  ₹{summary.admissibleAmount.toLocaleString()}
                </span>
              </div>
              <div className="w-px h-10 bg-slate-100"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Bill
                </span>
                <span className="text-xl font-black text-slate-800">
                  ₹{summary.totalBillAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handleSave(false)}
                className="px-8 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-2"
              >
                <Save size={16} /> Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-200 active:scale-95"
              >
                <CheckCircle size={16} /> Submit Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryInput = ({ label, value, onChange }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">
        ₹
      </span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100"
      />
    </div>
  </div>
);

const DetailInput = ({
  label,
  value,
  onChange,
  type = "text",
  isFull = false,
}: any) => (
  <div className={`space-y-1 ${isFull ? "col-span-2" : ""}`}>
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-4 focus:ring-rose-100 outline-none"
    />
  </div>
);

const SummaryRow = ({ label, value, color = "slate", bold = false }: any) => (
  <div
    className={`flex items-center justify-between py-1 border-b border-slate-50 ${bold ? "py-3 border-b-2 border-slate-100" : ""}`}
  >
    <span
      className={`text-xs font-bold ${bold ? "text-slate-800" : "text-slate-500"}`}
    >
      {label}
    </span>
    <span
      className={`text-xs font-black ${
        color === "rose"
          ? "text-rose-600"
          : color === "emerald"
            ? "text-emerald-600"
            : "text-slate-800"
      } ${bold ? "text-lg" : ""}`}
    >
      ₹{value.toLocaleString()}
    </span>
  </div>
);

export default FALLetterForm;
