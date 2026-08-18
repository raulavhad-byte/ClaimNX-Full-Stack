import React from "react";
import {
  OfficialPreauthTemplate,
  officialTemplateDefinition,
  previewCheckFields,
  previewValueFields,
} from "../services/officialPreauthTemplate";

interface Props {
  template: OfficialPreauthTemplate;
  formData: Record<string, any>;
}

/** Exact provider pages for visual review. The overlay uses the same points as
 * the PDF service, preventing preview/PDF drift. */
const OfficialPreauthTemplatePreview: React.FC<Props> = ({ template, formData }) => {
  const definition = officialTemplateDefinition(template);
  const fields = previewValueFields(template, formData);
  const checks = previewCheckFields(template, formData);

  return (
    <div className="official-preauth-pages bg-slate-200 p-4 sm:p-8 space-y-8 print:bg-white print:p-0 print:space-y-0">
      {Array.from({ length: definition.pageCount }, (_, index) => (
        <section
          key={index}
          className="official-preauth-page relative mx-auto bg-white shadow-lg print:shadow-none"
          style={{ aspectRatio: `${definition.pageWidth} / ${definition.pageHeight}` }}
        >
          <img
            src={`${definition.assetRoot}/page-${index + 1}.png`}
            alt={`${template} pre-authorisation form page ${index + 1}`}
            className="absolute inset-0 h-full w-full object-fill select-none"
            draggable={false}
          />
          {fields.filter((field) => field.page === index + 1).map((field) => field.value && (
            <span
              key={field.key}
              className="absolute overflow-hidden whitespace-nowrap font-bold leading-none text-[#00338d]"
              style={{
                left: field.left,
                top: field.top,
                width: field.widthPercent,
                fontSize: field.fontCqw,
              }}
            >
              {field.value}
            </span>
          ))}
          {checks.filter((field) => field.page === index + 1).map((field, checkIndex) => (
            <span
              key={`check-${checkIndex}`}
              className="official-preauth-check absolute font-black leading-none text-transparent"
              style={{ left: field.left, top: field.top, fontSize: field.fontCqw }}
              aria-label="Selected"
            >
              ✓
            </span>
          ))}
        </section>
      ))}
    </div>
  );
};

export default OfficialPreauthTemplatePreview;
