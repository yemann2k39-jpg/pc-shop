/**
 * Structured spec fields shown in the admin product editor, per category.
 *
 * Specs drive filtering (json_extract) and the compatibility engine, so they
 * must be edited as typed, structured fields — never free text. `list` fields
 * accept comma-separated values and are stored as string arrays.
 */

export type AdminSpecFieldType = "text" | "number" | "boolean" | "list";

export type AdminSpecField = {
  key: string;
  label: string;
  type: AdminSpecFieldType;
  /** Placeholder/example shown in the input. */
  placeholder?: string;
};

export const ADMIN_SPEC_FIELDS: Record<string, AdminSpecField[]> = {
  cpu: [
    { key: "socket", label: "Socket", type: "text", placeholder: "AM5" },
    { key: "cores", label: "Cores", type: "number" },
    { key: "threads", label: "Threads", type: "number" },
    { key: "tdpW", label: "TDP (W)", type: "number" },
    { key: "integratedGraphics", label: "Integrated graphics", type: "boolean" },
    { key: "supportedSockets", label: "Supported sockets (comma-separated)", type: "list", placeholder: "AM4, AM5" },
  ],
  gpu: [
    { key: "chipset", label: "Chipset", type: "text", placeholder: "RTX 5070" },
    { key: "vramGB", label: "VRAM (GB)", type: "number" },
    { key: "lengthMm", label: "Length (mm)", type: "number" },
  ],
  motherboard: [
    { key: "socket", label: "Socket", type: "text", placeholder: "AM5" },
    { key: "formFactor", label: "Form factor", type: "text", placeholder: "ATX" },
    { key: "memoryType", label: "Memory type", type: "text", placeholder: "DDR5" },
    { key: "maxMemoryGB", label: "Max memory (GB)", type: "number" },
  ],
  ram: [
    { key: "memoryType", label: "Memory type", type: "text", placeholder: "DDR5" },
    { key: "capacityGB", label: "Capacity (GB)", type: "number" },
    { key: "speedMHz", label: "Speed (MHz)", type: "number" },
    { key: "moduleCount", label: "Modules in kit", type: "number" },
  ],
  storage: [
    { key: "driveType", label: "Drive type", type: "text", placeholder: "NVMe" },
    { key: "capacityGB", label: "Capacity (GB)", type: "number" },
    { key: "readMbps", label: "Read speed (MB/s)", type: "number" },
  ],
  psu: [
    { key: "wattageW", label: "Wattage (W)", type: "number" },
    { key: "efficiencyCert", label: "Efficiency cert", type: "text", placeholder: "80+ Gold" },
    { key: "recommendedPsuW", label: "Recommended PSU (W)", type: "number" },
  ],
  cooler: [
    { key: "coolerType", label: "Cooler type", type: "text", placeholder: "AIO" },
    { key: "tdpRatingW", label: "Rated TDP (W)", type: "number" },
    { key: "supportedSockets", label: "Supported sockets (comma-separated)", type: "list", placeholder: "AM5, LGA1700" },
    { key: "radiatorMm", label: "Radiator size (mm)", type: "number" },
  ],
  case: [
    { key: "formFactorSupport", label: "Supported form factors (comma-separated)", type: "list", placeholder: "ATX, Micro-ATX" },
    { key: "maxGpuLengthMm", label: "Max GPU length (mm)", type: "number" },
    { key: "maxCoolerHeightMm", label: "Max cooler height (mm)", type: "number" },
  ],
};

export function specFieldsForCategory(categorySlug: string): AdminSpecField[] {
  return ADMIN_SPEC_FIELDS[categorySlug] ?? [];
}

/** Values shown as preset suggestions for common text fields. */
export const SPEC_SUGGESTIONS: Record<string, string[]> = {
  socket: ["AM4", "AM5", "LGA1700", "LGA1851"],
  formFactor: ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"],
  memoryType: ["DDR4", "DDR5"],
  driveType: ["NVMe", "SATA SSD", "HDD"],
  coolerType: ["Air", "AIO"],
  efficiencyCert: ["80+ White", "80+ Bronze", "80+ Gold", "80+ Platinum", "80+ Titanium"],
  chipset: ["RTX 5060", "RTX 5070", "RTX 5080", "RTX 5090", "RX 9060", "RX 9070", "RX 9070 XT"],
};
