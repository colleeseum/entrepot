const CONTACT_EMAIL = "storage@as-colle.com";

const SERVICE_PRICES = {
  battery: 25,
  propane: 25,
};

const CONTACT_FOR_PRICING =
  "We will contact you to gather more information and confirm pricing for this vehicle.";
const ENTER_LENGTH_MESSAGE = "Enter the vehicle length to estimate pricing.";

const SEASON_TIMING = {
  winter: {
    label: "Winter 2026-2027",
    timeframe: "16 Oct 2026 – 25 Apr 2027",
    dropoffWindow: "16 Oct to 1 Nov 2026",
    pickupDeadline: "25 Apr 2027",
  },
  summer: {
    label: "Summer 2026",
    timeframe: "2 May 2026 – 9 Oct 2026",
    dropoffWindow: "2 May 2026",
    pickupDeadline: "9 Oct 2026",
  },
};

const SEASON_BY_LABEL = Object.entries(SEASON_TIMING).reduce(
  (acc, [key, value]) => {
    acc[value.label] = { ...value, id: key };
    return acc;
  },
  {},
);

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return `$${num.toLocaleString("en-CA", { maximumFractionDigits: 0 })}`;
};

const parseCurrencyValue = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === "string" ? value : String(value);
  const amount = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) ? amount : null;
};

const formatPhoneNumber = (value = "") => {
  const input = String(value || "").trim();
  if (!input) return "";
  const digits = input.replace(/\D+/g, "");
  if (!digits) return input;

  let local = digits;
  if (local.length === 11 && local.startsWith("1")) {
    local = local.slice(1);
  }

  if (local.length === 10) {
    const area = local.slice(0, 3);
    const exchange = local.slice(3, 6);
    const station = local.slice(6);
    return `+1 ${area}-${exchange}-${station}`;
  }

  if (local.length === 7) {
    const exchange = local.slice(0, 3);
    const station = local.slice(3);
    return `${exchange}-${station}`;
  }

  return input;
};

const formatPdfDate = (value = "") => {
  if (!value) return "";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (isoMatch.test(value)) {
    const [, year, month, day] = isoMatch.exec(value);
    return `${month}/${day}/${year}`;
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
  return value;
};

const ESTIMATE_RULES = {
  "Winter 2026-2027": {
    "RV/Motorhome": ({ length }) => {
      if (!length) return ENTER_LENGTH_MESSAGE;
      return formatCurrency(Math.max(length * 23, 460));
    },
    Car: ({ length }) => {
      if (!length) return ENTER_LENGTH_MESSAGE;
      if (length <= 15) return formatCurrency(415);
      if (length <= 20) return formatCurrency(460);
      return CONTACT_FOR_PRICING;
    },
    Truck: () => CONTACT_FOR_PRICING,
    Motorcycle: () => formatCurrency(180),
    "Can-Am Spyder": () => formatCurrency(245),
    Snowmobile: () => CONTACT_FOR_PRICING,
    "Snowmobile + single trailer": () => CONTACT_FOR_PRICING,
    Other: () => CONTACT_FOR_PRICING,
  },
  "Summer 2026": {
    "RV/Motorhome": () => CONTACT_FOR_PRICING,
    Car: ({ length }) => {
      if (!length) return ENTER_LENGTH_MESSAGE;
      if (length <= 15) return formatCurrency(415);
      return CONTACT_FOR_PRICING;
    },
    Truck: () => CONTACT_FOR_PRICING,
    Motorcycle: () => CONTACT_FOR_PRICING,
    "Can-Am Spyder": () => CONTACT_FOR_PRICING,
    Snowmobile: () => formatCurrency(180),
    "Snowmobile + single trailer": () => formatCurrency(255),
    Other: () => CONTACT_FOR_PRICING,
  },
};

const estimateRentalCost = (values) => {
  const season = values.season;
  if (!season || !ESTIMATE_RULES[season]) {
    return "";
  }
  if (!values.vehicleType) {
    return "";
  }
  const rules = ESTIMATE_RULES[season];
  const rule = rules[values.vehicleType] || (() => CONTACT_FOR_PRICING);
  const length = Number.parseFloat(values.vehicleLength);
  const ctx = {
    length: Number.isFinite(length) ? length : null,
    values,
  };
  const base = rule(ctx) || CONTACT_FOR_PRICING;
  if (base === CONTACT_FOR_PRICING || base === ENTER_LENGTH_MESSAGE) {
    return base;
  }

  const baseAmount = Number(base.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(baseAmount)) {
    return base;
  }

  let total = baseAmount;
  if (values.battery === "yes") {
    total += SERVICE_PRICES.battery;
  }
  if (values.propane === "yes") {
    total += SERVICE_PRICES.propane;
  }
  return formatCurrency(total);
};

const RULE_GROUPS = [
  {
    id: "winter",
    title: "Winter key dates",
    items: [
      "Drop-off window: 16 Oct – 1 Nov 2026.",
      "Pick-up deadline: 25 Apr 2027 (late fee $5/day).",
      "Give us 48 hours notice before winter drop-offs or pickups so we can stage your bay.",
    ],
  },
  {
    id: "summer",
    title: "Summer key dates",
    items: [
      "Season: 2 May – 9 Oct 2026.",
      "Pick-up appointments booked 7 days in advance.",
      "Plan your own battery disconnect unless you add the Colle service.",
    ],
  },
  {
    id: "access",
    title: "Access & maintenance",
    items: [
      `Remove propane before storage or use our $${SERVICE_PRICES.propane} propane tank service so we can keep barns compliant.`,
      `Battery disconnect and smart charging available for $${SERVICE_PRICES.battery}, otherwise disconnect and take the battery with you.`,
      "Vehicles remain locked; access requests incur a handling fee.",
      "Payment due on arrival via bank transfer or cash. Personal insurance required.",
      "Deposits are non-refundable but transferable to another vehicle in the same season.",
      "Tell us if your vehicle leaks oil so we can prep drip trays.",
    ],
  },
];

const RULE_LOOKUP = RULE_GROUPS.reduce((acc, group) => {
  acc[group.id] = group.items;
  return acc;
}, {});

const SHARED_POLICY_CARD = {
  id: "shared",
  name: "Access & maintenance",
  seasonLabel: "Applies to every booking",
  description:
    "Propane, payment, deposit and access rules that cover both indoor and outdoor storage.",
  pricing: [],
  policies: [...RULE_LOOKUP.access],
};

const SEASON_CONFIG = [
  {
    id: "winter",
    name: "Winter Storage",
    seasonLabel: SEASON_TIMING.winter.label,
    timeframe: SEASON_TIMING.winter.timeframe,
    deposit: "$100 if estimate exceeds $250 • $50 otherwise",
    description:
      "Indoor barns and outdoor concrete pads suited for RVs, cars, motorcycles and Spyder units.",
    pricing: [
      {
        label: "Indoor trailer / motorhome",
        price: "$23.00 / ft",
        note: "minimum $460",
      },
      {
        label: "Outdoor trailer / RV on concrete (≤30 ft)",
        price: "$380",
        note: "flat rate",
      },
      { label: "Indoor car (≤15 ft)", price: "$415" },
      { label: "Indoor car (15–20 ft)", price: "$460" },
      { label: "Indoor motorcycle", price: "$180" },
      { label: "Indoor Can-Am Spyder", price: "$245" },
    ],
    policies: [...RULE_LOOKUP.winter],
  },
  {
    id: "summer",
    name: "Summer Storage",
    seasonLabel: SEASON_TIMING.summer.label,
    timeframe: SEASON_TIMING.summer.timeframe,
    deposit: "$100 if estimate exceeds $250 • $50 otherwise",
    description:
      "Indoor non-heated bays sized for compact cars and snowmobiles with trailer parking.",
    pricing: [
      { label: "Indoor car (≤15 ft)", price: "$415" },
      { label: "Snowmobile", price: "$180" },
      { label: "Snowmobile + single trailer", price: "$255" },
      { label: "Snowmobile(s) + double trailer", price: "$450" },
    ],
    policies: [...RULE_LOOKUP.summer],
  },
];

const STORAGE_TERMS = [
  ...RULE_LOOKUP.access,
  "Storage is at the tenant’s risk; proof of personal insurance is mandatory.",
  "Staff positions every unit; no on-site access during storage without prior approval.",
];

const seasonGridEl = document.getElementById("season-grid");
const storageRulesEl = document.getElementById("storage-rules");
const servicePriceEls = document.querySelectorAll("[data-service-price]");

const buildSeasonCards = () => {
  if (!seasonGridEl) return;
  seasonGridEl.innerHTML = "";

  [...SEASON_CONFIG, SHARED_POLICY_CARD].forEach((season) => {
    const card = document.createElement("article");
    card.className = "season-card";
    if (season.id === "shared") {
      card.classList.add("season-card--full");
    }
    const heading = document.createElement("div");
    const description = season.description
      ? `<p>${season.description}</p>`
      : "";
    const timeframe = season.timeframe
      ? `<p><strong>${season.timeframe}</strong></p>`
      : "";
    const deposit = season.deposit ? `<p>Deposit: ${season.deposit}</p>` : "";
    heading.innerHTML = `
            <p class="eyebrow">${season.seasonLabel}</p>
            <h3>${season.name}</h3>
            ${description}
            ${timeframe}
            ${deposit}
        `;

    let table = null;
    if (season.pricing && season.pricing.length) {
      table = document.createElement("table");
      season.pricing.forEach((offer) => {
        const row = document.createElement("tr");
        const label = document.createElement("td");
        label.textContent = offer.note
          ? `${offer.label} (${offer.note})`
          : offer.label;
        const price = document.createElement("td");
        price.textContent = offer.price;
        row.appendChild(label);
        row.appendChild(price);
        table.appendChild(row);
      });
    }

    card.appendChild(heading);
    if (table) {
      card.appendChild(table);
    }
    const list = document.createElement("ul");
    season.policies.forEach((policy) => {
      const li = document.createElement("li");
      li.textContent = policy;
      list.appendChild(li);
    });
    card.appendChild(list);
    seasonGridEl.appendChild(card);
  });
};

const buildStorageRules = () => {
  if (!storageRulesEl) return;
  storageRulesEl.innerHTML = "";

  RULE_GROUPS.forEach((group) => {
    const article = document.createElement("article");
    const heading = document.createElement("h3");
    heading.textContent = group.title;
    const list = document.createElement("ul");

    group.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });

    article.appendChild(heading);
    article.appendChild(list);
    storageRulesEl.appendChild(article);
  });
};

const initFormStepper = () => {
  const form = document.getElementById("contract-helper");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".form-step"));
  const navButtons = Array.from(form.querySelectorAll("[data-step-target]"));
  const nextBtn = form.querySelector("[data-step-next]");
  const prevBtn = form.querySelector("[data-step-prev]");

  let currentStep = 0;

  const gotoStep = (index) => {
    if (index < 0 || index >= steps.length) return;
    steps.forEach((step, idx) => {
      step.classList.toggle("active", idx === index);
    });
    navButtons.forEach((btn) => {
      btn.classList.toggle(
        "active",
        Number(btn.dataset.stepTarget) - 1 === index,
      );
    });
    currentStep = index;
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;
    if (prevBtn) {
      prevBtn.classList.toggle("hidden", isFirst);
      prevBtn.disabled = isFirst;
    }
    if (nextBtn) {
      nextBtn.classList.toggle("hidden", isLast);
      nextBtn.disabled = isLast;
    }
  };

  if (nextBtn) {
    nextBtn.addEventListener("click", () => gotoStep(currentStep + 1));
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", () => gotoStep(currentStep - 1));
  }
  navButtons.forEach((btn) =>
    btn.addEventListener("click", () =>
      gotoStep(Number(btn.dataset.stepTarget) - 1),
    ),
  );

  gotoStep(0);

  const seasonSelect = form.querySelector('select[name="season"]');
  const leaseDurationInput = form.querySelector('input[name="leaseDuration"]');
  const leaseCostInput = form.querySelector('input[name="leaseCost"]');
  const vehicleLengthInput = form.querySelector('input[name="vehicleLength"]');
  const vehicleTypeOtherInput = form.querySelector(
    'input[name="vehicleTypeOther"]',
  );
  const tenantPhoneInput = form.querySelector('input[name="tenantPhone"]');
  const depositInput = form.querySelector('input[name="deposit"]');

  const applyDepositRule = (estimatedValue) => {
    if (!depositInput) return;
    const amount = parseCurrencyValue(estimatedValue);
    if (amount === null) return;
    const depositValue = amount > 250 ? 100 : 50;
    const currentValue = Number(depositInput.value);
    if (!Number.isFinite(currentValue) || currentValue !== depositValue) {
      depositInput.value = depositValue;
    }
  };

  const updateLeaseDuration = () => {
    if (!seasonSelect || !leaseDurationInput) return;
    const selected = seasonSelect.value;
    const seasonInfo = SEASON_BY_LABEL[selected];
    if (seasonInfo) {
      leaseDurationInput.value = seasonInfo.timeframe.replace(" – ", " to ");
    } else {
      leaseDurationInput.value = "";
    }
  };
  const updateEstimatedCost = () => {
    if (!leaseCostInput) return;
    const formValues = Object.fromEntries(new FormData(form).entries());
    const estimate = estimateRentalCost(formValues);
    leaseCostInput.value = estimate;
    applyDepositRule(estimate);
  };
  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      updateLeaseDuration();
      updateEstimatedCost();
    });
    updateLeaseDuration();
  }

  const vehicleTypeSelect = document.getElementById("vehicle-type-select");
  const vehicleTypeOther = document.getElementById("vehicle-type-other");
  if (vehicleTypeSelect && vehicleTypeOther) {
    const toggleOther = () => {
      const isOther = vehicleTypeSelect.value === "Other";
      vehicleTypeOther.classList.toggle("hidden", !isOther);
      const input = vehicleTypeOther.querySelector("input");
      if (input) {
        input.required = isOther;
      }
      updateEstimatedCost();
    };
    vehicleTypeSelect.addEventListener("change", toggleOther);
    toggleOther();
  }

  const serviceCheckboxes = [
    form.querySelector('input[name="battery"]'),
    form.querySelector('input[name="propane"]'),
  ];

  [vehicleLengthInput, vehicleTypeOtherInput, ...serviceCheckboxes].forEach(
    (el) => {
      if (!el) return;
      el.addEventListener("input", updateEstimatedCost);
      el.addEventListener("change", updateEstimatedCost);
    },
  );

  if (vehicleTypeSelect) {
    vehicleTypeSelect.addEventListener("change", () => {
      updateEstimatedCost();
    });
  }

  if (tenantPhoneInput) {
    const enforcePhoneFormat = () => {
      const formatted = formatPhoneNumber(tenantPhoneInput.value);
      if (formatted && formatted !== tenantPhoneInput.value) {
        tenantPhoneInput.value = formatted;
      }
    };
    tenantPhoneInput.addEventListener("blur", enforcePhoneFormat);
    enforcePhoneFormat();
  }

  updateEstimatedCost();
};

const populateServicePrices = () => {
  if (!servicePriceEls.length) return;
  servicePriceEls.forEach((el) => {
    const key = el.dataset.servicePrice;
    const amount = SERVICE_PRICES[key];
    if (typeof amount === "number") {
      el.textContent = `$${amount}`;
    }
  });
};

const handleContactForm = () => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get("name") || "Storage inquiry";
    const email = data.get("email") || "";
    const vehicle = data.get("vehicle") || "Vehicle details not provided";
    const message = data.get("message") || "";

    const subject = encodeURIComponent(`Storage request from ${name}`);
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Vehicle: ${vehicle}`,
      "",
      message,
    ];

    const body = encodeURIComponent(bodyLines.join("\n"));
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  });
};

const handleContractHelper = () => {
  const form = document.getElementById("contract-helper");
  if (!form || !window.PDFLib) return;

  const previewModal = document.getElementById("contract-preview-modal");
  const previewFrame = document.getElementById("contract-preview-frame");
  const previewStatus = document.getElementById("contract-preview-status");
  const previewDownloadBtn = document.querySelector("[data-preview-download]");
  const previewCloseElements = document.querySelectorAll(
    "[data-preview-close]",
  );
  const signingInfoTrigger = document.querySelector(
    "[data-signing-info-trigger]",
  );
  const signingInfoPopover = document.querySelector("[data-signing-info]");
  let previewUrl = null;
  let previewFilename = "";

  const cleanupPreviewUrl = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
  };

  const updatePreviewActions = (enabled) => {
    if (previewDownloadBtn) {
      previewDownloadBtn.disabled = !enabled;
    }
  };

  const triggerDownload = (url, filename) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "colle-storage.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSigningPopover = (show) => {
    if (!signingInfoPopover) return;
    signingInfoPopover.hidden = !show;
  };

  if (signingInfoTrigger && signingInfoPopover) {
    let popoverVisible = false;
    signingInfoTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      popoverVisible = !popoverVisible;
      toggleSigningPopover(popoverVisible);
    });
    previewModal?.addEventListener("click", (event) => {
      if (!popoverVisible) return;
      if (
        event.target !== signingInfoTrigger &&
        !signingInfoPopover.contains(event.target)
      ) {
        popoverVisible = false;
        toggleSigningPopover(false);
      }
    });
  }

  const showPreview = ({ url, filename }) => {
    if (!url) return;
    if (!previewModal || !previewFrame) {
      triggerDownload(url, filename);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      return;
    }
    cleanupPreviewUrl();
    previewUrl = url;
    previewFilename = filename;
    previewFrame.src = url;
    previewModal.classList.remove("hidden");
    previewModal.setAttribute("aria-hidden", "false");
    updatePreviewActions(true);
    if (previewStatus) {
      previewStatus.textContent = `Preview ready: ${filename}`;
    }
    try {
      previewFrame.focus({ preventScroll: true });
    } catch (err) {
      // no-op
    }
  };

  const closePreview = () => {
    if (!previewModal) return;
    previewModal.classList.add("hidden");
    previewModal.setAttribute("aria-hidden", "true");
    if (previewFrame) {
      previewFrame.src = "about:blank";
    }
    toggleSigningPopover(false);
  };

  previewDownloadBtn?.addEventListener("click", () => {
    if (!previewUrl) return;
    triggerDownload(previewUrl, previewFilename);
    closePreview();
  });

  previewCloseElements.forEach((el) =>
    el.addEventListener("click", () => {
      closePreview();
    }),
  );
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePreview();
    }
  });
  previewModal?.addEventListener("click", (event) => {
    if (event.target === previewModal) {
      closePreview();
    }
  });

  window.addEventListener("beforeunload", cleanupPreviewUrl);
  updatePreviewActions(false);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    try {
      const payload = await generateContractPdf(formData);
      showPreview(payload);
    } catch (err) {
      console.error("Unable to generate PDF", err);
      alert(
        "Something went wrong while building the PDF. Please try again or download the blank contract.",
      );
    }
  });
};

const CONTRACT_TEMPLATE_URL =
  "./static/documents/storage-contract-template-d848.pdf";

const buildTenantAddress = (data) => {
  const tenantStreet = (data.tenantAddress || "").trim();
  const tenantCity = (data.tenantCity || "").trim();
  const tenantProvince = (data.tenantProvince || "").trim();
  const tenantPostal = (data.tenantPostal || "").toUpperCase().trim();
  const provincePostal = [tenantProvince, tenantPostal].filter(Boolean).join(" ");
  return [tenantStreet, tenantCity, provincePostal].filter(Boolean).join(", ");
};

const generateContractPdf = async (data) => {
  const { PDFDocument, PDFName, PDFBool, StandardFonts } = window.PDFLib;
  const response = await fetch(CONTRACT_TEMPLATE_URL);
  if (!response.ok) {
    throw new Error("Unable to load the contract template PDF.");
  }
  const templateBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const updateAppearance = (field, force = false) => {
    if (!field || !force) return;
    try {
      field.updateAppearances(helvetica);
    } catch (err) {
      console.warn(
        `Unable to update appearance for ${field.getName?.() || "unknown"}`,
        err,
      );
    }
  };

  const setTextField = (nameOrNames, value = "", refresh = false) => {
    const names = Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames];
    for (const name of names) {
      try {
        const field = form.getTextField(name);
        field.setText(value ? String(value) : "");
        updateAppearance(field, refresh);
        return true;
      } catch (err) {}
    }
    return false;
  };

  const setChoiceField = (name, value = "") => {
    const normalized = value ? String(value) : "";
    if (!normalized) return;
    try {
      const field = form.getDropdown(name);
      field.select(normalized);
      updateAppearance(field, true);
    } catch (err) {
      console.warn(`Missing choice field: ${name}`, err);
    }
  };

  const setDropdownField = (name, value = "") => {
    setChoiceField(name, value);
  };

  const setCheck = (name, checked) => {
    try {
      const field = form.getCheckBox(name);
      if (checked) {
        field.check();
      } else {
        field.uncheck();
      }
    } catch (err) {
      console.warn(`Missing checkbox: ${name}`, err);
    }
  };

  const tenantAddressLine = buildTenantAddress(data);
  const formattedPhone = formatPhoneNumber(data.tenantPhone);
  const estimatedCostDisplay = estimateRentalCost(data);
  const depositValue = parseCurrencyValue(data.deposit) || 0;
  const estimatedAmount = parseCurrencyValue(estimatedCostDisplay) || 0;
  const batteryFee = data.battery === "yes" ? SERVICE_PRICES.battery : 0;
  const propaneFee = data.propane === "yes" ? SERVICE_PRICES.propane : 0;
  const servicesTotal = batteryFee + propaneFee;
  const remainingAmount = Math.max(estimatedAmount - depositValue, 0);
  const servicesDisplay =
    servicesTotal > 0 ? formatCurrency(servicesTotal) : "$0";
  const remainingDisplay =
    remainingAmount > 0 ? formatCurrency(remainingAmount) : "$0";
  const tenantSigLocationValue = [data.tenantCity, data.tenantProvince]
    .filter(Boolean)
    .join(", ") || "Alfred, ON";
  const contractNumber = Date.now().toString();

  setDropdownField("season", data.season || "");
  setTextField("tenantName", data.tenantName || "");
  setTextField("tenantPhone", formattedPhone);
  setTextField("tenantEmail", data.tenantEmail || "");
  setTextField("tenantAddress", tenantAddressLine);
  setDropdownField("vehicleType", data.vehicleType || "");
  setTextField("vehicleTypeOther", data.vehicleTypeOther || "");
  setTextField("vehicleBrand", data.vehicleBrand || "");
  setTextField("vehicleModel", data.vehicleModel || "");
  setTextField("vehicleColour", data.vehicleColour || "");
  setTextField("vehicleLength", data.vehicleLength || "");
  setTextField(["vehicleYear", "Number_1"], data.vehicleYear || "");
  setTextField("vehiclePlate", data.vehiclePlate || "");
  setDropdownField("vehicleProv", data.vehicleProv || "");
  setTextField("insuranceCompany", data.insuranceCompany || "");
  setTextField("insurancePolicy", data.insurancePolicy || "");
  setTextField(
    "insuranceExpiration",
    formatPdfDate(data.insuranceExpiration) || "",
    true,
  );
  setTextField("leaseDuration", data.leaseDuration || "");
  setTextField(
    "leaseCost",
    estimatedAmount ? String(estimatedAmount) : data.leaseCost || "",
  );
  setTextField(
    "deposit",
    depositValue ? String(depositValue) : data.deposit || "",
  );
  setTextField("service Cost", servicesTotal ? String(servicesTotal) : "");
  setTextField("remaining", remainingAmount ? String(remainingAmount) : "");
  setTextField(["contractNumber", "contract"], contractNumber);
  setTextField("tenantSigLocation", tenantSigLocationValue);
  setTextField(
    "tenantSigDate",
    formatPdfDate(new Date().toISOString().slice(0, 10)),
    true,
  );
  const safeSetText = (name) => {
    try {
      const field = form.getTextField(name);
      field.setText("");
    } catch (err) {
      // ignore missing or non-text fields
    }
  };
  safeSetText("tenantSignature");
  safeSetText("repSignature");
  setTextField("repSigLocation", "");
  setTextField("repSigDate", "");

  setCheck("battery", data.battery === "yes");
  setCheck("propane", data.propane === "yes");

  const acroFormDict = pdfDoc.catalog.lookup(PDFName.of("AcroForm"));
  if (acroFormDict) {
    acroFormDict.set(PDFName.of("NeedAppearances"), PDFBool.True);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  return { url, filename: `colle-storage-${contractNumber}.pdf` };
};

const seasonWindow = (seasonName = "") => {
  const normalized = seasonName.toLowerCase();
  let entry = null;

  if (normalized.includes("winter")) {
    entry = SEASON_TIMING.winter;
  } else if (normalized.includes("summer")) {
    entry = SEASON_TIMING.summer;
  }

  if (!entry) {
    return "See confirmation email";
  }

  const dropoff = entry.dropoffWindow || entry.timeframe.split("–")[0].trim();
  return `${dropoff} drop-off, pick-up by ${entry.pickupDeadline}`;
};

document.addEventListener("DOMContentLoaded", () => {
  buildSeasonCards();
  buildStorageRules();
  initFormStepper();
  populateServicePrices();
  handleContactForm();
  handleContractHelper();
});
