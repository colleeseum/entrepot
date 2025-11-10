const CONTACT_EMAIL = "storage@as-colle.com";

const SEASON_CONFIG = [
  {
    id: "winter",
    name: "Winter Storage",
    seasonLabel: "Winter 2025-2026",
    timeframe: "17 Oct 2025 – 26 Apr 2026",
    deposit: "$100 per space ($40 for motorcycles & sleds)",
    description:
      "Indoor barns and outdoor concrete pads suited for RVs, cars, motorcycles and Spyder units.",
    pricing: [
      {
        label: "Indoor trailer / motorhome",
        price: "$22.50 / ft",
        note: "minimum $450",
      },
      {
        label: "Outdoor trailer / RV on concrete (≤30 ft)",
        price: "$370",
        note: "flat rate",
      },
      { label: "Indoor car (≤15 ft)", price: "$405" },
      { label: "Indoor car (15–20 ft)", price: "$450" },
      { label: "Indoor motorcycle", price: "$175" },
      { label: "Indoor Can-Am Spyder", price: "$240" },
    ],
    policies: [
      "Vehicles stored between 17 Oct and 1 Nov; pickup by 26 Apr ($5/day late fee).",
      "No gas cans or propane tanks. Access requests incur a handling fee.",
      "Email or call 48 hours before drop-off or pick-up so we can stage the space.",
      "Payment due on arrival via bank transfer or cash. Personal insurance required.",
    ],
  },
  {
    id: "summer",
    name: "Summer Storage",
    seasonLabel: "Summer 2025",
    timeframe: "3 May 2025 – 10 Oct 2025",
    deposit: "$100 per car • $40 per sled",
    description:
      "Indoor non-heated bays sized for compact cars and snowmobiles with trailer parking.",
    pricing: [
      { label: "Indoor car (≤15 ft)", price: "$405" },
      { label: "Snowmobile", price: "$170" },
      { label: "Snowmobile + single trailer", price: "$250" },
      { label: "Snowmobile(s) + double trailer", price: "$440" },
    ],
    policies: [
      "Pick up no later than 10 Oct (late fee $5/day).",
      "Battery disconnect included for cars before storage.",
      "Book your pickup 7 days in advance so we can stage the lane.",
      "Non-refundable deposits secure your slot; payment due the day the unit arrives.",
    ],
  },
];

const STORAGE_TERMS = [
  "Storage is at the tenant’s risk; proof of personal insurance is mandatory.",
  "Deposits are non-refundable but transferable to another vehicle for the same season.",
  "Staff positions every unit; no on-site access during storage without prior approval.",
  "Notify us if your vehicle leaks oil so drip trays can be placed before arrival.",
];

const seasonGridEl = document.getElementById("season-grid");

const buildSeasonCards = () => {
  if (!seasonGridEl) return;
  seasonGridEl.innerHTML = "";

  SEASON_CONFIG.forEach((season) => {
    const card = document.createElement("article");
    card.className = "season-card";
    const heading = document.createElement("div");
    heading.innerHTML = `
            <p class="eyebrow">${season.seasonLabel}</p>
            <h3>${season.name}</h3>
            <p>${season.description}</p>
            <p><strong>${season.timeframe}</strong></p>
            <p>Deposit: ${season.deposit}</p>
        `;

    const table = document.createElement("table");
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

    const list = document.createElement("ul");
    season.policies.forEach((policy) => {
      const li = document.createElement("li");
      li.textContent = policy;
      list.appendChild(li);
    });

    card.appendChild(heading);
    card.appendChild(table);
    card.appendChild(list);
    seasonGridEl.appendChild(card);
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    try {
      await generateContractPdf(formData);
    } catch (err) {
      console.error("Unable to generate PDF", err);
      alert(
        "Something went wrong while building the PDF. Please try again or download the blank contract.",
      );
    }
  });
};

const generateContractPdf = async (data) => {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();
  const pageSize = [612, 792];
  let page = pdfDoc.addPage(pageSize);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let cursorY = 742;
  const marginX = 54;
  const lineHeight = 18;

  const ensureSpace = (needed = lineHeight) => {
    if (cursorY - needed < 60) {
      page = pdfDoc.addPage(pageSize);
      cursorY = 742;
    }
  };

  const writeLine = (text, options = {}) => {
    ensureSpace(options.lineHeight || lineHeight);
    page.drawText(text, {
      x: marginX,
      y: cursorY,
      size: options.size || 12,
      font: options.bold ? bold : regular,
      color: options.color || rgb(0, 0, 0),
    });
    cursorY -= options.lineHeight || lineHeight;
  };

  const divider = () => {
    ensureSpace(12);
    page.drawRectangle({
      x: marginX,
      y: cursorY - 2,
      width: page.getWidth() - marginX * 2,
      height: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    cursorY -= 12;
  };

  writeLine("Colle Storage — Seasonal Vehicle Contract", {
    bold: true,
    size: 18,
    lineHeight: 26,
  });
  writeLine(`Season: ${data.season || "N/A"}`, { bold: true, lineHeight: 20 });
  writeLine("Tenant information", { bold: true, lineHeight: 20 });
  writeLine(`Name: ${data.tenantName || ""}`);
  writeLine(`Phone: ${data.phone || ""}`);
  writeLine(`Email: ${data.email || ""}`);
  writeLine(`Address: ${data.address || ""}`);
  divider();

  writeLine("Vehicle details", { bold: true, lineHeight: 20 });
  writeLine(`Type: ${data.vehicleType || ""}`);
  writeLine(`Length: ${data.length || "n/a"} ft`);
  writeLine(`Plate/Province: ${data.plate || ""}`);
  writeLine(`Insurance: ${data.insuranceCompany || ""}`);
  writeLine(`Policy #: ${data.policyNumber || ""}`);
  divider();

  writeLine("Financials", { bold: true, lineHeight: 20 });
  writeLine(`Deposit on file: $${data.deposit || "0"}`);
  writeLine("Balance is due the day the vehicle arrives on site.");
  divider();

  writeLine("Notes", { bold: true, lineHeight: 20 });
  const noteLines = (data.notes || "Special instructions:").split("\n");
  noteLines.forEach((line) => writeLine(line));
  divider();

  writeLine("Storage conditions", { bold: true, lineHeight: 20 });
  STORAGE_TERMS.concat([
    `Drop-off window for ${data.season || "the season"}: ${seasonWindow(data.season)}`,
    "Tenant agrees to schedule arrivals/departures within the required notice period.",
  ]).forEach((term, index) => {
    writeLine(`${index + 1}. ${term}`);
  });
  divider();

  writeLine("Signatures", { bold: true, lineHeight: 20 });
  writeLine(
    "Tenant signature: ________________________________       Date: ____________",
  );
  writeLine(
    "Lessor signature: ________________________________       Date: ____________",
  );
  writeLine(
    "Colle Farm • 276 rue Dolbec, St-Eustache, QC J7R 6N5 • 514-627-5377",
    {
      size: 10,
      lineHeight: 22,
    },
  );

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `colle-storage-${Date.now()}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const seasonWindow = (seasonName = "") => {
  if (seasonName.toLowerCase().includes("winter")) {
    return "17 Oct to 1 Nov drop-off, pick-up by 26 Apr";
  }
  if (seasonName.toLowerCase().includes("summer")) {
    return "3 May drop-off, pick-up by 10 Oct";
  }
  return "See confirmation email";
};

document.addEventListener("DOMContentLoaded", () => {
  buildSeasonCards();
  handleContactForm();
  handleContractHelper();
});
