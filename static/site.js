const CONTACT_EMAILS = {
  default: "storage@as-colle.com",
  en: "warehouse@as-colle.com",
  fr: "entrepot@as-colle.com",
};

const getContactEmail = (lang = currentLanguage) => {
  return CONTACT_EMAILS[lang] || CONTACT_EMAILS.default;
};

const SERVICE_PRICES = {
  battery: 25,
  propane: 25,
};

const SUPPORTED_LANGUAGES = ["en", "fr"];
const DEFAULT_LANGUAGE = "en";
const LANGUAGE_STORAGE_KEY = "ferme-colle-language";
let currentLanguage = DEFAULT_LANGUAGE;
let syncContractHelperLanguage = () => {};

const CONTRACT_TEMPLATES = {
  en: "./static/documents/contract-en.pdf",
  fr: "./static/documents/contract-fr.pdf",
};

const VEHICLE_TYPES = [
  {
    value: "RV/Motorhome",
    labels: { en: "RV/Motorhome", fr: "VR/Camping-car" },
  },
  { value: "Car", labels: { en: "Car", fr: "Voiture" } },
  { value: "Truck", labels: { en: "Truck", fr: "Camion" } },
  { value: "Motorcycle", labels: { en: "Motorcycle", fr: "Motocyclette" } },
  { value: "Can-Am Spyder", labels: { en: "Can-Am Spyder", fr: "Can-Am Spyder" } },
  { value: "Snowmobile", labels: { en: "Snowmobile", fr: "Motoneige" } },
  {
    value: "Snowmobile + single trailer",
    labels: {
      en: "Snowmobile + single trailer",
      fr: "Motoneige + remorque simple",
    },
  },
  {
    value: "Snowmobile + double trailer",
    labels: {
      en: "Snowmobile + double trailer",
      fr: "Motoneige + remorque double",
    },
  },
  { value: "Other", labels: { en: "Other", fr: "Autre" } },
];

const getVehicleLabelForLanguage = (value, lang = currentLanguage) => {
  if (!value) return "";
  const entry = VEHICLE_TYPES.find((type) => type.value === value);
  if (!entry) return value;
  return entry.labels[lang] || entry.labels[DEFAULT_LANGUAGE] || value;
};

const LENGTH_REQUIRED_TYPES = new Set([
  "RV/Motorhome",
  "Car",
  "Truck",
  "Other",
]);

const CONTRACT_FORM_MEMORY_PREFIX = "contract-helper-vehicle-";
const CONTRACT_FORM_MEMORY_FIELDS = [
  "vehicleType",
  "vehicleTypeOther",
  "vehicleBrand",
  "vehicleModel",
  "vehicleColour",
  "vehicleLength",
  "vehicleYear",
  "vehiclePlate",
  "vehicleProv",
  "insuranceCompany",
  "insurancePolicy",
  "battery",
  "propane",
];

const getVehicleStorageKey = (type) => {
  if (!type) return null;
  return `${CONTRACT_FORM_MEMORY_PREFIX}${type}`;
};


const formatCurrency = (value, lang = currentLanguage, options = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const locale = getLocale(lang);
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  });
  const amount = formatter.format(num);
  return lang === "fr" ? `${amount}\u00A0$` : `$${amount}`;
};

const formatPdfCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
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

const SEASON_DEFINITIONS = [
  {
    id: "winter",
    name: { en: "Winter Storage", fr: "Entreposage d’hiver" },
    seasonLabel: { en: "Winter 2026-2027", fr: "Hiver 2026-2027" },
    timeframe: { en: "16 Oct 2026 – 25 Apr 2027", fr: "16 oct. 2026 – 25 avr. 2027" },
    duration: { en: "16 Oct 2026 to 25 Apr 2027", fr: "16 oct. 2026 au 25 avr. 2027" },
    dropoffWindow: { en: "16 Oct to 1 Nov 2026", fr: "16 oct. au 1er nov. 2026" },
    pickupDeadline: { en: "25 Apr 2027", fr: "25 avr. 2027" },
    deposit: {
      en: "$100 if estimate exceeds $250 • $50 otherwise",
      fr: "100 $ si l’estimation dépasse 250 $, sinon 50 $",
    },
    description: {
      en: "Indoor warehouses and outdoor concrete pads suited for RVs, cars, motorcycles and Spyder units.",
      fr: "Des entrepôts intérieurs et des dalles extérieures idéales pour VR, voitures, motos et Spyder.",
    },
    ruleTitle: { en: "Winter key dates", fr: "Dates clés de l’hiver" },
    offers: [
      {
        id: "winter-rv-indoor",
        label: {
          en: "Indoor trailer / motorhome",
          fr: "Remorque ou motorisé intérieur",
        },
        price: {
          mode: "perFoot",
          rate: 23,
          minimum: 460,
          unit: { en: "/ ft", fr: "/ pi" },
        },
        note: { en: "minimum {{amount}}", fr: "minimum {{amount}}" },
        vehicleTypes: ["RV/Motorhome"],
      },
      {
        id: "winter-rv-outdoor",
        label: {
          en: "Concrete outdoor pad (≤30 ft)",
          fr: "Dalle extérieure en béton (≤30 pi)",
        },
        price: { mode: "flat", amount: 380 },
        note: { en: "flat rate", fr: "tarif fixe" },
      },
      {
        id: "winter-car-short",
        label: {
          en: "Indoor car/truck (≤15 ft)",
          fr: "Voiture/camion intérieure (≤15 pi)",
        },
        price: { mode: "flat", amount: 415 },
        vehicleTypes: ["Car", "Truck"],
        lengthRange: { max: 15 },
      },
      {
        id: "winter-car-long",
        label: {
          en: "Indoor car/truck (15–20 ft)",
          fr: "Voiture/truck intérieure (15–20 pi)",
        },
        price: { mode: "flat", amount: 460 },
        vehicleTypes: ["Car", "Truck"],
        lengthRange: { min: 15, exclusiveMin: true, max: 20 },
      },
      {
        id: "winter-car-contact",
        label: {
          en: "Oversized car",
          fr: "Voiture surdimensionnée",
        },
        price: { mode: "contact" },
        vehicleTypes: ["Car", "Truck"],
        lengthRange: { min: 20, exclusiveMin: true },
        hideInTable: true,
      },
      {
        id: "winter-motorcycle",
        label: { en: "Indoor motorcycle", fr: "Moto intérieure" },
        price: { mode: "flat", amount: 180 },
        vehicleTypes: ["Motorcycle"],
      },
      {
        id: "winter-spyder",
        label: { en: "Indoor Can-Am Spyder", fr: "Can-Am Spyder intérieur" },
        price: { mode: "flat", amount: 245 },
        vehicleTypes: ["Can-Am Spyder"],
      },
      {
        id: "winter-snowmobile",
        label: { en: "Snowmobile", fr: "Motoneige" },
        price: { mode: "contact" },
        vehicleTypes: ["Snowmobile"],
        hideInTable: true,
      },
      {
        id: "winter-snowmobile-trailer",
        label: {
          en: "Snowmobile + single trailer",
          fr: "Motoneige + remorque simple",
        },
        price: { mode: "contact" },
        vehicleTypes: ["Snowmobile + single trailer"],
        hideInTable: true,
      },
      {
        id: "winter-other",
        label: { en: "Other", fr: "Autre" },
        price: { mode: "contact" },
        vehicleTypes: ["Other"],
        hideInTable: true,
      },
    ],
    policies: [
      {
        en: "Drop-off window: 16 Oct – 1 Nov 2026.",
        fr: "Période de dépôt : 16 oct. au 1 nov. 2026.",
      },
      {
        en: "Pick-up deadline: 25 Apr 2027 (late fee $5/day).",
        fr: "Sortie au plus tard le 25 avr. 2027 (5 $/jour de retard).",
      },
      {
        en: "Give us 48 hours notice before winter drop-offs or pickups so we can stage your bay.",
        fr: "Prévoyez 48 heures d’avis pour les dépôts ou sorties d’hiver afin que nous préparions votre baie.",
      },
    ],
  },
  {
    id: "summer",
    name: { en: "Summer Storage", fr: "Entreposage d’été" },
    seasonLabel: { en: "Summer 2026", fr: "Été 2026" },
    timeframe: { en: "2 May 2026 – 9 Oct 2026", fr: "2 mai 2026 – 9 oct. 2026" },
    duration: { en: "2 May 2026 to 9 Oct 2026", fr: "2 mai 2026 au 9 oct. 2026" },
    dropoffWindow: { en: "2 May 2026", fr: "2 mai 2026" },
    pickupDeadline: { en: "9 Oct 2026", fr: "9 oct. 2026" },
    deposit: {
      en: "$100 if estimate exceeds $250 • $50 otherwise",
      fr: "100 $ si l’estimation dépasse 250 $, sinon 50 $",
    },
    description: {
      en: "Indoor non-heated bays sized for compact cars and snowmobiles with trailer parking.",
      fr: "Des baies non chauffées conçues pour les voitures compactes et les motoneiges avec espace pour les remorques.",
    },
    ruleTitle: { en: "Summer key dates", fr: "Dates clés de l’été" },
    offers: [
      {
        id: "summer-car-short",
        label: {
          en: "Indoor car/truck (≤15 ft)",
          fr: "Voiture/camion intérieure (≤15 pi)",
        },
        price: { mode: "flat", amount: 415 },
        vehicleTypes: ["Car", "Truck"],
        lengthRange: { max: 15 },
      },
      {
        id: "summer-car-contact",
        label: {
          en: "Oversized car",
          fr: "Voiture surdimensionnée",
        },
        price: { mode: "contact" },
        vehicleTypes: ["Car", "Truck"],
        lengthRange: { min: 15, exclusiveMin: true },
        hideInTable: true,
      },
      {
        id: "summer-snowmobile",
        label: { en: "Snowmobile", fr: "Motoneige" },
        price: { mode: "flat", amount: 180 },
        vehicleTypes: ["Snowmobile"],
      },
      {
        id: "summer-snowmobile-trailer",
        label: {
          en: "Snowmobile + single trailer",
          fr: "Motoneige + remorque simple",
        },
        price: { mode: "flat", amount: 255 },
        vehicleTypes: ["Snowmobile + single trailer"],
      },
      {
        id: "summer-snowmobile-double",
        label: {
          en: "Snowmobile(s) + double trailer",
          fr: "Motoneiges + remorque double",
        },
        price: { mode: "flat", amount: 450 },
        note: { en: "flat rate", fr: "tarif fixe" },
        vehicleTypes: ["Snowmobile + double trailer"],
      },
      {
        id: "summer-rv",
        label: { en: "RV/Motorhome", fr: "VR / Motorisé" },
        price: { mode: "contact" },
        vehicleTypes: ["RV/Motorhome"],
        hideInTable: true,
      },
      {
        id: "summer-motorcycle",
        label: { en: "Motorcycle", fr: "Moto" },
        price: { mode: "contact" },
        vehicleTypes: ["Motorcycle"],
        hideInTable: true,
      },
      {
        id: "summer-spyder",
        label: { en: "Can-Am Spyder", fr: "Can-Am Spyder" },
        price: { mode: "contact" },
        vehicleTypes: ["Can-Am Spyder"],
        hideInTable: true,
      },
      {
        id: "summer-other",
        label: { en: "Other", fr: "Autre" },
        price: { mode: "contact" },
        vehicleTypes: ["Other"],
        hideInTable: true,
      },
    ],
    policies: [
      {
        en: "Season: 2 May – 9 Oct 2026.",
        fr: "Saison : 2 mai au 9 oct. 2026.",
      },
      {
        en: "Pick-up appointments booked 7 days in advance.",
        fr: "Les rendez-vous de sortie se prennent 7 jours d’avance.",
      },
      {
        en: "Plan your own battery disconnect unless you add the Ferme Colle service.",
        fr: "Prévoyez débrancher votre batterie à moins d’ajouter le service Ferme Colle.",
      },
    ],
  },
];

const SHARED_POLICY_CARD = {
  id: "shared",
  name: { en: "Access & maintenance", fr: "Accès et entretien" },
  seasonLabel: {
    en: "Applies to every booking",
    fr: "S’applique à toutes les réservations",
  },
  description: {
    en: "Propane, payment, deposit and access rules that cover both indoor and outdoor storage.",
    fr: "Règles sur le propane, les paiements, les dépôts et l’accès pour tout type d’entreposage.",
  },
  ruleTitle: { en: "Access & maintenance", fr: "Accès et entretien" },
  policies: [
    (lang) =>
      lang === "fr"
        ? `Retirez le propane avant l’entreposage ou utilisez notre service de bonbonne à ${formatCurrency(SERVICE_PRICES.propane, lang)} pour respecter les normes des entrepôts.`
        : `Remove propane before storage or use our ${formatCurrency(SERVICE_PRICES.propane, lang)} propane tank service so we can keep warehouses compliant.`,
    (lang) =>
      lang === "fr"
        ? `Le service de déconnexion et de charge intelligente est offert pour ${formatCurrency(SERVICE_PRICES.battery, lang)}; sinon, débranchez et apportez la batterie.`
        : `Battery disconnect and smart charging available for ${formatCurrency(SERVICE_PRICES.battery, lang)}, otherwise disconnect and take the battery with you.`,
    {
      en: "Vehicles remain locked; access requests incur a handling fee.",
      fr: "Les véhicules demeurent verrouillés; les accès sur demande entraînent des frais de manutention.",
    },
    {
      en: "Payment due on arrival via bank transfer or cash. Personal insurance required.",
      fr: "Paiement à l’arrivée par virement bancaire ou en argent. L’assurance personnelle est obligatoire.",
    },
    {
      en: "Deposits are non-refundable but transferable to another vehicle in the same season.",
      fr: "Les dépôts sont non remboursables mais transférables à un autre véhicule de la même saison.",
    },
    {
      en: "Tell us if your vehicle leaks oil so we can prep drip trays.",
      fr: "Informez-nous si votre véhicule fuit pour que nous préparions des plateaux anti-gouttes.",
    },
  ],
};

const I18N = {
  "nav.seasons": { en: "Seasons", fr: "Saisons" },
  "nav.facility": { en: "Facility", fr: "Installations" },
  "nav.contract": { en: "Contract", fr: "Contrat" },
  "nav.contact": { en: "Contact", fr: "Contact" },
  "header.languageLabel": {
    en: "Language selector",
    fr: "Sélecteur de langue",
  },
  "hero.eyebrow": {
    en: "Indoor & outdoor vehicle storage",
    fr: "Entreposage intérieur et extérieur de véhicules",
  },
  "hero.title": {
    en: "Protect your RV, car or sled in every season",
    fr: "Protégez votre VR, voiture ou motoneige en toute saison",
  },
  "hero.description": {
    en: "Two curated storage seasons with concrete floors, easy highway access, and bilingual support. Drop off in Alfred, Ontario; pay once; pick up on your schedule.",
    fr: "Deux saisons d’entreposage avec planchers en béton, accès rapide aux routes principales et soutien bilingue. Déposez à Alfred, en Ontario, payez une fois et récupérez selon votre horaire.",
  },
  "hero.ctaReserve": { en: "Reserve a spot", fr: "Réservez un espace" },
  "hero.ctaCall": { en: "Call 514-627-5377", fr: "Appelez le 514-627-5377" },
  "hero.caption": {
    en: "Most vehicles stay indoors in 20 ft tall warehouses with monitored access.",
    fr: "La majorité des véhicules demeurent dans des entrepôts de 20 pi surveillés en tout temps.",
  },
  "facility.eyebrow": { en: "Why Alfred?", fr: "Pourquoi Alfred?" },
  "facility.heading": {
    en: "Purpose-built storage only 45 minutes east of Ottawa / 60 minutes west of Montreal",
    fr: "Un entreposage conçu sur mesure à 45 minutes d’Ottawa et 60 minutes de Montréal",
  },
  "facility.description": {
    en: "Located in Alfred, Ontario with multiple indoor warehouses for RVs, cars and sleds, plus drive-through lanes and an outdoor yard poured in concrete. The same family that runs Ferme Colle oversees every check-in.",
    fr: "Situé à Alfred, en Ontario, avec plusieurs entrepôts intérieurs pour VR, voitures et motoneiges, des allées traversantes et une cour extérieure en béton. La même famille que la Ferme Colle supervise chaque arrivée.",
  },
  "facility.indoor.title": {
    en: "Indoor warehouse bays",
    fr: "Baies d’entrepôt intérieur",
  },
  "facility.indoor.body": {
    en: "Non-heated warehouse bays with 20 ft clearance keep vehicles dry and away from UV exposure.",
    fr: "Des baies d’entrepôt non chauffées avec 20 pi de dégagement gardent les véhicules au sec et à l’abri des UV.",
  },
  "facility.outdoor.title": {
    en: "Concrete outdoor pads",
    fr: "Dalles extérieures en béton",
  },
  "facility.outdoor.body": {
    en: "Outdoor RV pads are poured concrete, ideal for RVs up to 30 ft with rear access.",
    fr: "Les dalles extérieures en béton accueillent les VR jusqu’à 30 pi avec accès arrière.",
  },
  "facility.details.deposits": {
    en: "Deposits: $100 when the estimate exceeds $250, otherwise $50.",
    fr: "Dépôts : 100 $ lorsque l’estimation dépasse 250 $, sinon 50 $.",
  },
  "facility.details.battery": {
    en: "Battery disconnect and intelligent charger service is available for most vehicles.",
    fr: "Le service de déconnexion et de charge intelligente de batterie est offert pour la majorité des véhicules.",
  },
  "facility.details.appointments": {
    en: "Drop-off appointments coordinated 2 days (winter) or 7 days (summer) ahead.",
    fr: "Les rendez-vous de dépôt sont coordonnés 2 jours à l’avance l’hiver ou 7 jours l’été.",
  },
  "facility.details.payments": {
    en: "Payments accepted via bank transfer or cash.",
    fr: "Les paiements se font par virement bancaire ou en argent comptant.",
  },
  "facility.details.insurance": {
    en: "Personal insurance required while stored on site.",
    fr: "Une assurance personnelle est requise pendant l’entreposage.",
  },
  "seasonSection.eyebrow": {
    en: "Seasonal plans",
    fr: "Plans saisonniers",
  },
  "seasonSection.heading": {
    en: "Pick the season that matches your storage window",
    fr: "Choisissez la saison qui correspond à votre période d’entreposage",
  },
  "services.eyebrow": { en: "Add-on services", fr: "Services additionnels" },
  "services.heading": {
    en: "Keep essentials onsite so pickup day is effortless",
    fr: "Gardez l’essentiel sur place pour un départ sans souci",
  },
  "services.description": {
    en: "Select any add-on when you schedule your drop-off—each service is billed with your storage balance.",
    fr: "Ajoutez les services désirés lors du dépôt : ils seront facturés avec votre entreposage.",
  },
  "services.battery.title": {
    en: "Battery maintenance",
    fr: "Entretien de batterie",
  },
  "services.battery.body": {
    en: `Intelligent chargers keep your battery topped up and conditioned while the vehicle is parked indoors. Battery disconnect and intelligent charger service is available for <strong><span data-service-price="battery"></span></strong>.`,
    fr: `Des chargeurs intelligents maintiennent votre batterie en santé pendant l’entreposage intérieur. Le service de déconnexion et de charge est offert pour <strong><span data-service-price="battery"></span></strong>.`,
  },
  "services.propane.title": {
    en: "Propane tank storage",
    fr: "Entreposage de bonbonnes de propane",
  },
  "services.propane.body": {
    en: `Drop your propane tank at check-in and we store it separately in our ventilated cage so your RV can stay on site. Flat <strong><span data-service-price="propane"></span></strong> per tank per season.`,
    fr: `Déposez vos bonbonnes lors de l’arrivée et nous les rangeons dans une cage ventilée pour que votre VR demeure sur place. <strong><span data-service-price="propane"></span></strong> par bonbonne par saison.`,
  },
  "contractSection.eyebrow": {
    en: "Contracts & deposits",
    fr: "Contrats et dépôts",
  },
  "contractSection.heading": {
    en: "Download the storage agreement or auto-fill one in seconds",
    fr: "Téléchargez le contrat ou remplissez-le automatiquement en quelques secondes",
  },
  "contractSection.description": {
    en: "Start with our standard PDF or use our smart contract helper to generate a draft that already includes your vehicle info. For insurance purposes, submit one contract per vehicle.",
    fr: "Utilisez notre PDF standard ou l’assistant intelligent pour générer un projet qui contient déjà les informations de votre véhicule. Pour des raisons d’assurance, un contrat distinct est requis par véhicule.",
  },
  "contractStandard.title": {
    en: "Standard paperwork",
    fr: "Documents standards",
  },
  "contractStandard.body": {
    en: `Always available and bilingual. Use the fillable PDF form, sign digitally or by hand, and email it to <a href="mailto:storage@as-colle.com" data-contact-email>storage@as-colle.com</a>. Once our team validates the information, they will reach out for a deposit to reserve your spot.`,
    fr: `Toujours disponibles et bilingues. Utilisez le PDF remplissable, signez-le numériquement ou à la main et envoyez-le à <a href="mailto:storage@as-colle.com" data-contact-email>storage@as-colle.com</a>. Une fois les informations validées, notre équipe communiquera avec vous pour percevoir le dépôt.`,
  },
  "contractStandard.button": {
    en: "Download blank contract",
    fr: "Télécharger le contrat vierge",
  },
  "contractStandard.mobileNote": {
    en: "On phones, download the bilingual PDF and send it in once completed. The smart helper is available on tablets and desktops.",
    fr: "Sur téléphone, téléchargez le PDF bilingue et retournez-le une fois rempli. L’assistant intelligent est offert sur tablette et ordinateur.",
  },
  "contractHelper.title": {
    en: "Smart contract helper",
    fr: "Assistant intelligent de contrat",
  },
  "form.steps.tenant": { en: "1. Tenant", fr: "1. Locataire" },
  "form.steps.vehicle": { en: "2. Vehicle", fr: "2. Véhicule" },
  "form.steps.insurance": {
    en: "3. Insurance & add-ons",
    fr: "3. Assurance et ajouts",
  },
  "form.steps.review": {
    en: "4. Review & submit",
    fr: "4. Vérifier et envoyer",
  },
  "form.season.label": { en: "Season", fr: "Saison" },
  "form.selectPrompt": {
    en: "-- Please select one --",
    fr: "-- Veuillez choisir --",
  },
  "form.fullName.label": { en: "Full name", fr: "Nom complet" },
  "form.phone.label": { en: "Phone", fr: "Téléphone" },
  "form.email.label": { en: "Email", fr: "Courriel" },
  "form.address.label": { en: "Mailing address", fr: "Adresse postale" },
  "form.city.label": { en: "City", fr: "Ville" },
  "form.postal.label": { en: "Postal code", fr: "Code postal" },
  "form.province.label": { en: "Province", fr: "Province" },
  "form.vehicleType.label": { en: "Vehicle type", fr: "Type de véhicule" },
  "form.vehicleType.other": { en: "Please specify", fr: "Précisez" },
  "form.brand.label": { en: "Brand", fr: "Marque" },
  "form.model.label": { en: "Model", fr: "Modèle" },
  "form.colour.label": { en: "Colour", fr: "Couleur" },
  "form.length.label": { en: "Length (ft)", fr: "Longueur (pi)" },
  "form.year.label": { en: "Year", fr: "Année" },
  "form.plate.label": { en: "Plate", fr: "Plaque" },
  "form.vehicleProvince.label": { en: "Province", fr: "Province" },
  "form.resetVehicle": {
    en: "Clear saved vehicle data",
    fr: "Effacer les données du véhicule",
  },
  "form.insuranceCompany.label": {
    en: "Insurance company",
    fr: "Compagnie d’assurance",
  },
  "form.policyNumber.label": {
    en: "Policy number",
    fr: "Numéro de police",
  },
  "form.expiration.label": { en: "Expiration", fr: "Expiration" },
  "form.service.battery": {
    en: "Battery charging service",
    fr: "Service de charge de batterie",
  },
  "form.service.propane": {
    en: "Propane tank storage",
    fr: "Entreposage de bonbonne de propane",
  },
  "form.addons.title": {
    en: "Add-on services",
    fr: "Services additionnels",
  },
  "form.deposit.label": {
    en: "Deposit ($) — auto: $100 if estimate > $250, else $50",
    fr: "Dépôt ($) — auto : 100 $ si l’estimation > 250 $, sinon 50 $",
  },
  "form.leaseDuration.label": { en: "Lease duration", fr: "Durée du bail" },
  "form.leaseCost.label": {
    en: "Estimated rental cost",
    fr: "Coût estimé de location",
  },
  "form.completedPlaceholder": {
    en: "Ferme Colle will reach out with an estimate",
    fr: "Ferme Colle vous contactera avec un devis",
  },
  "form.notes.label": { en: "Notes", fr: "Notes" },
  "form.notes.placeholder": {
    en: "Add extra drivers, storage requests or bank transfer info",
    fr: "Ajoutez des conducteurs, demandes d’entreposage ou info de virement",
  },
  "form.preview": { en: "Preview PDF", fr: "Prévisualiser le PDF" },
  "form.previewHint": {
    en: "Powered by <code>pdf-lib</code>. The draft PDF opens locally and never leaves your browser.",
    fr: "Propulsé par <code>pdf-lib</code>. L’ébauche de PDF s’ouvre localement et ne quitte jamais votre navigateur.",
  },
  "form.back": { en: "Back", fr: "Retour" },
  "form.next": { en: "Next", fr: "Suivant" },
  "infoSection.eyebrow": { en: "Storage rules", fr: "Règles d’entreposage" },
  "infoSection.heading": {
    en: "Simple guardrails keep everyone on schedule",
    fr: "Quelques règles simples pour rester dans les délais",
  },
  "contactSection.eyebrow": { en: "Ready to store?", fr: "Prêt à entreposer?" },
  "contactSection.heading": {
    en: "Call, email or send the form—everything routes to our professional team",
    fr: "Téléphonez, écrivez ou utilisez le formulaire : tout se rend à notre équipe",
  },
  "contactSection.talkTitle": { en: "Talk to us", fr: "Parlez-nous" },
  "contactSection.talkBodyPrimary": {
    en: `Phone: <a href="tel:514-627-5377">514-627-5377</a><br />Email: <a href="mailto:storage@as-colle.com" data-contact-email>storage@as-colle.com</a><br />Site: Conc 4, Alfred, ON K0B 1A0`,
    fr: `Téléphone : <a href="tel:514-627-5377">514-627-5377</a><br />Courriel : <a href="mailto:storage@as-colle.com" data-contact-email>storage@as-colle.com</a><br />Site : Conc 4, Alfred, ON K0B 1A0`,
  },
  "contactSection.talkBodySecondary": {
    en: "We are 60 minutes from Montréal and 45 minutes from Ottawa. Drop-offs are by appointment to keep traffic moving.",
    fr: "Nous sommes à 60 minutes de Montréal et 45 minutes d’Ottawa. Les dépôts se font sur rendez-vous pour garder la circulation fluide.",
  },
  "contactSection.formTitle": { en: "Email shortcut", fr: "Raccourci courriel" },
  "contactForm.name.label": { en: "Your name", fr: "Votre nom" },
  "contactForm.email.label": { en: "Email", fr: "Courriel" },
  "contactForm.vehicle.label": { en: "Vehicle type", fr: "Type de véhicule" },
  "contactForm.message.label": { en: "Message", fr: "Message" },
  "contactForm.message.placeholder": {
    en: "Tell us what you need stored & your ideal drop-off date",
    fr: "Précisez ce que vous souhaitez entreposer et votre date idéale",
  },
  "contactForm.submit": { en: "Compose email", fr: "Préparer le courriel" },
  "contactForm.hint": {
    en: "Submitting opens a ready-to-send email so nothing gets lost.",
    fr: "L’envoi ouvre un courriel prêt à être expédié pour ne rien oublier.",
  },
  "modal.eyebrow": { en: "Preview & export", fr: "Aperçu et export" },
  "modal.title": { en: "Contract preview", fr: "Aperçu du contrat" },
  "modal.status": {
    en: "Generate a preview to review details before exporting.",
    fr: "Générez un aperçu pour valider les détails avant l’export.",
  },
  "modal.close": { en: "Close preview", fr: "Fermer l’aperçu" },
  "modal.instructionsText": {
    en: `Once signed, email the contract to <a href="mailto:storage@as-colle.com" data-contact-email>storage@as-colle.com</a>.`,
    fr: `Une fois signé, envoyez le contrat à <a href="mailto:storage@as-colle.com" data-contact-email>storage@as-colle.com</a>.`,
  },
  "modal.signingLabel": {
    en: "Signing instructions",
    fr: "Instructions de signature",
  },
  "modal.signingTitle": {
    en: "Recommended ways to complete the signature:",
    fr: "Façons recommandées de compléter la signature :",
  },
  "modal.signingOption1": {
    en: "Sign digitally in a PDF app such as Adobe Acrobat",
    fr: "Signez numériquement dans une application PDF comme Adobe Acrobat",
  },
  "modal.signingOption2": {
    en: "Print, sign, scan and email the file",
    fr: "Imprimez, signez, numérisez puis envoyez le fichier",
  },
  "modal.signingOption3": {
    en: "Use any signing process your organization prefers",
    fr: "Utilisez le processus de signature préféré de votre organisation",
  },
  "modal.download": { en: "Download PDF", fr: "Télécharger le PDF" },
  "modal.readyStatus": {
    en: "Preview ready: {{filename}}",
    fr: "Aperçu prêt : {{filename}}",
  },
  "footer.address": { en: "Address", fr: "Adresse" },
  "footer.bookings": { en: "Bookings", fr: "Réservations" },
  "footer.office": { en: "Office", fr: "Bureau" },
  "seasonCard.depositLabel": { en: "Deposit", fr: "Dépôt" },
  "messages.contactForPricing": {
    en: "Ferme Colle will reach out with an estimate.",
    fr: "Ferme Colle vous contactera avec un devis.",
  },
  "messages.enterLength": {
    en: "Enter the vehicle length to estimate pricing.",
    fr: "Indiquez la longueur du véhicule pour obtenir une estimation.",
  },
  "messages.pdfError": {
    en: "Something went wrong while building the PDF. Please try again or download the blank contract.",
    fr: "Un problème est survenu lors de la création du PDF. Réessayez ou téléchargez le contrat vierge.",
  },
  "messages.seasonWindow": {
    en: "{{dropoff}} drop-off, pick-up by {{pickup}}",
    fr: "Dépôt {{dropoff}}, récupération au plus tard le {{pickup}}",
  },
  "messages.seasonWindowFallback": {
    en: "See confirmation email",
    fr: "Voir le courriel de confirmation",
  },
  "contactForm.subject": {
    en: "Storage request from {{name}}",
    fr: "Demande d’entreposage de {{name}}",
  },
  "contactForm.inquiryFallback": {
    en: "Storage inquiry",
    fr: "Demande d’entreposage",
  },
  "contactForm.bodyName": { en: "Name", fr: "Nom" },
  "contactForm.bodyEmail": { en: "Email", fr: "Courriel" },
  "contactForm.bodyVehicle": { en: "Vehicle", fr: "Véhicule" },
  "contactForm.vehicleFallback": {
    en: "Vehicle details not provided",
    fr: "Détails du véhicule non fournis",
  },
};

const getTranslation = (key, lang = currentLanguage) => {
  const entry = I18N[key];
  if (!entry) return "";
  return entry[lang] || entry[DEFAULT_LANGUAGE] || "";
};

const getMessage = (key, lang = currentLanguage) => getTranslation(key, lang);

const formatTemplate = (template, replacements = {}) => {
  if (!template) return "";
  return template.replace(/{{(\w+)}}/g, (_, token) => {
    const value = replacements[token];
    return value === undefined ? "" : String(value);
  });
};

const getLocale = (lang = currentLanguage) => (lang === "fr" ? "fr-CA" : "en-CA");
const getLocalizedText = (value, lang = currentLanguage) => {
  if (typeof value === "function") {
    return value(lang);
  }
  if (value && typeof value === "object") {
    return value[lang] || value[DEFAULT_LANGUAGE] || "";
  }
  return value || "";
};

const SEASON_LOOKUP = SEASON_DEFINITIONS.reduce((acc, season) => {
  acc[season.id] = season;
  return acc;
}, {});

const getAllSeasonCards = () => [...SEASON_DEFINITIONS, SHARED_POLICY_CARD];

const getSeasonLabelForLanguage = (seasonId, lang = currentLanguage) => {
  const season = SEASON_LOOKUP[seasonId];
  if (!season) return "";
  return getLocalizedText(season.seasonLabel, lang);
};

const findSeasonByLabel = (label = "") => {
  if (!label) return null;
  const normalized = label.toLowerCase();
  return SEASON_DEFINITIONS.find((season) => {
    const en = getLocalizedText(season.seasonLabel, "en").toLowerCase();
    const fr = getLocalizedText(season.seasonLabel, "fr").toLowerCase();
    return normalized === en || normalized === fr;
  });
};

const STORAGE_RULE_GROUPS = [
  {
    id: "winter",
    title: SEASON_LOOKUP.winter.ruleTitle,
    policies: () => SEASON_LOOKUP.winter.policies,
  },
  {
    id: "summer",
    title: SEASON_LOOKUP.summer.ruleTitle,
    policies: () => SEASON_LOOKUP.summer.policies,
  },
  {
    id: "shared",
    title: SHARED_POLICY_CARD.ruleTitle,
    policies: () => SHARED_POLICY_CARD.policies,
  },
];

const offerRequiresLength = (offer) => {
  if (!offer) return false;
  if (offer.price?.mode === "perFoot") return true;
  return Boolean(offer.lengthRange);
};

const lengthMatchesRange = (length, range) => {
  if (!range) return true;
  if (!Number.isFinite(length)) return false;
  if (typeof range.min === "number") {
    if (range.exclusiveMin) {
      if (!(length > range.min)) return false;
    } else if (!(length >= range.min)) {
      return false;
    }
  }
  if (typeof range.max === "number") {
    if (range.exclusiveMax) {
      if (!(length < range.max)) return false;
    } else if (!(length <= range.max)) {
      return false;
    }
  }
  return true;
};

const getOffersForType = (season, vehicleType) => {
  if (!season || !vehicleType) return [];
  return season.offers.filter(
    (offer) => Array.isArray(offer.vehicleTypes) && offer.vehicleTypes.includes(vehicleType),
  );
};

const computeOfferPrice = (offer, context) => {
  if (!offer || !offer.price) return null;
  if (offer.price.mode === "contact") return null;
  if (offer.price.mode === "flat") {
    return offer.price.amount;
  }
  if (offer.price.mode === "perFoot") {
    const length = context.length;
    if (!Number.isFinite(length)) return null;
    const minimum = offer.price.minimum || 0;
    return Math.max(length * offer.price.rate, minimum);
  }
  return null;
};

const estimateRentalCost = (values) => {
  const season = SEASON_LOOKUP[values.season];
  if (!season || !values.vehicleType) {
    return "";
  }
  const offers = getOffersForType(season, values.vehicleType);
  if (!offers.length) {
    return getMessage("messages.contactForPricing");
  }
  const length = Number.parseFloat(values.vehicleLength);
  const numericLength = Number.isFinite(length) ? length : null;
  const needsLength = offers.some(offerRequiresLength);
  if (needsLength && !Number.isFinite(numericLength)) {
    return getMessage("messages.enterLength");
  }
  const matchedOffer = offers.find((offer) =>
    lengthMatchesRange(numericLength, offer.lengthRange),
  );
  const offer = matchedOffer || offers[offers.length - 1];
  const baseAmount = computeOfferPrice(offer, { length: numericLength });
  if (!Number.isFinite(baseAmount)) {
    return getMessage("messages.contactForPricing");
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

const formatOfferPriceDisplay = (offer, lang = currentLanguage) => {
  if (!offer || !offer.price) return "";
  if (offer.price.mode === "flat") {
    return formatCurrency(offer.price.amount, lang);
  }
  if (offer.price.mode === "perFoot") {
    const rate = formatCurrency(offer.price.rate, lang, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const unit =
      getLocalizedText(offer.price.unit, lang) || (lang === "fr" ? "/ pi" : "/ ft");
    return `${rate} ${unit}`;
  }
  return getMessage("messages.contactForPricing", lang);
};

const formatOfferNote = (offer, lang = currentLanguage) => {
  if (!offer || !offer.note) return "";
  const template = getLocalizedText(offer.note, lang);
  if (!template) return "";
  const replacements = {};
  if (template.includes("{{amount}}")) {
    const minimum = offer.price?.minimum;
    replacements.amount = minimum ? formatCurrency(minimum, lang) : "";
  }
  return formatTemplate(template, replacements);
};


const seasonGridEl = document.getElementById("season-grid");
const storageRulesEl = document.getElementById("storage-rules");
const servicePriceEls = document.querySelectorAll("[data-service-price]");
const contractDownloadLink = document.querySelector("[data-contract-download]");

const getContractTemplateUrl = (lang = currentLanguage) => {
  return CONTRACT_TEMPLATES[lang] || CONTRACT_TEMPLATES[DEFAULT_LANGUAGE];
};

const buildSeasonCards = () => {
  if (!seasonGridEl) return;
  seasonGridEl.innerHTML = "";

  getAllSeasonCards().forEach((season) => {
    const card = document.createElement("article");
    card.className = "season-card";
    if (season.id === "shared") {
      card.classList.add("season-card--full");
    }
    const heading = document.createElement("div");
    const description = season.description
      ? `<p>${getLocalizedText(season.description)}</p>`
      : "";
    const timeframe = season.timeframe
      ? `<p><strong>${getLocalizedText(season.timeframe)}</strong></p>`
      : "";
    const deposit = season.deposit
      ? `<p>${getTranslation("seasonCard.depositLabel")}: ${getLocalizedText(season.deposit)}</p>`
      : "";
    heading.innerHTML = `
            <p class="eyebrow">${getLocalizedText(season.seasonLabel)}</p>
            <h3>${getLocalizedText(season.name)}</h3>
            ${description}
            ${timeframe}
            ${deposit}
        `;

    let table = null;
    if (season.offers && season.offers.length) {
      const visibleOffers = season.offers.filter((offer) => !offer.hideInTable);
      if (visibleOffers.length) {
        table = document.createElement("table");
        visibleOffers.forEach((offer) => {
          const row = document.createElement("tr");
          const label = document.createElement("td");
          const note = formatOfferNote(offer);
          label.textContent = note
            ? `${getLocalizedText(offer.label)} (${note})`
            : getLocalizedText(offer.label);
          const price = document.createElement("td");
          price.textContent = formatOfferPriceDisplay(offer);
          row.appendChild(label);
          row.appendChild(price);
          table.appendChild(row);
        });
      }
    }

    card.appendChild(heading);
    if (table) {
      card.appendChild(table);
    }
    const list = document.createElement("ul");
    (season.policies || []).forEach((policy) => {
      const li = document.createElement("li");
      li.textContent = getLocalizedText(policy);
      list.appendChild(li);
    });
    card.appendChild(list);
    seasonGridEl.appendChild(card);
  });
};

const buildStorageRules = () => {
  if (!storageRulesEl) return;
  storageRulesEl.innerHTML = "";

  STORAGE_RULE_GROUPS.forEach((group) => {
    const article = document.createElement("article");
    const heading = document.createElement("h3");
    heading.textContent = getLocalizedText(group.title);
    const list = document.createElement("ul");

    const items = typeof group.policies === "function" ? group.policies() : [];
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = getLocalizedText(item);
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

  const validateStepsBefore = (targetIndex) => {
    if (targetIndex <= 0) {
      return { valid: true };
    }
    for (let stepIndex = 0; stepIndex < targetIndex; stepIndex += 1) {
      const stepEl = steps[stepIndex];
      if (!stepEl) continue;
      const fields = Array.from(
        stepEl.querySelectorAll("input, select, textarea"),
      ).filter((field) => field.type !== "hidden" && !field.closest(".hidden"));
      for (const field of fields) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return { valid: false, invalidStep: stepIndex };
        }
      }
    }
    return { valid: true };
  };

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
    nextBtn.addEventListener("click", () => {
      const targetIndex = currentStep + 1;
      const validation = validateStepsBefore(targetIndex);
      if (!validation.valid) {
        gotoStep(validation.invalidStep);
        return;
      }
      gotoStep(targetIndex);
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener("click", () => gotoStep(currentStep - 1));
  }
  navButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      const targetIndex = Number(btn.dataset.stepTarget) - 1;
      const validation = validateStepsBefore(targetIndex);
      if (!validation.valid) {
        gotoStep(validation.invalidStep);
        return;
      }
      gotoStep(targetIndex);
    }),
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
  const vehicleTypeSelect = document.getElementById("vehicle-type-select");
  const insuranceExpirationInput = form.querySelector(
    'input[name="insuranceExpiration"]',
  );
  const propaneCheckbox = form.querySelector('input[name="propane"]');

  let isApplyingFormMemory = false;
  const loadFormMemory = (type = vehicleTypeSelect?.value) => {
    const storageKey = getVehicleStorageKey(type);
    if (!storageKey) return {};
    if (typeof window === "undefined" || !window.localStorage) return {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  };
  const saveFormMemory = () => {
    if (isApplyingFormMemory) return;
    if (typeof window === "undefined" || !window.localStorage) return;
    const storageKey = getVehicleStorageKey(vehicleTypeSelect?.value);
    if (!storageKey) return;
    const data = new FormData(form);
    const payload = {};
    CONTRACT_FORM_MEMORY_FIELDS.forEach((name) => {
      const value = data.get(name);
      if (value) {
        payload[name] = value;
      }
    });
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {}
  };
  const applyFormMemory = (type = vehicleTypeSelect?.value) => {
    const stored = loadFormMemory(type);
    const entries = Object.entries(stored || {});
    if (!entries.length) return;
    isApplyingFormMemory = true;
    entries.forEach(([name, value]) => {
      const field = form.elements[name];
      if (!field) return;
      if (field.type === "checkbox") {
        field.checked = value === "yes";
      } else {
        field.value = value;
      }
    });
    isApplyingFormMemory = false;
    if (vehicleTypeSelect && vehicleTypeOther) {
      const isOther = vehicleTypeSelect.value === "Other";
      vehicleTypeOther.classList.toggle("hidden", !isOther);
      const input = vehicleTypeOther.querySelector("input");
      if (input) {
        input.required = isOther;
      }
    }
  };

  const populateSeasonSelect = () => {
    if (!seasonSelect) return;
    const selectedValue = seasonSelect.value;
    seasonSelect
      .querySelectorAll("option:not([value=''])")
      .forEach((option) => option.remove());
    SEASON_DEFINITIONS.forEach((season) => {
      const option = document.createElement("option");
      option.value = season.id;
      option.textContent = getLocalizedText(season.seasonLabel);
      seasonSelect.appendChild(option);
    });
    if (selectedValue) {
      seasonSelect.value = selectedValue;
    }
  };

  const populateVehicleTypeOptions = () => {
    if (!vehicleTypeSelect) return;
    const selectedValue = vehicleTypeSelect.value;
    vehicleTypeSelect
      .querySelectorAll("option:not([value=''])")
      .forEach((option) => option.remove());
    VEHICLE_TYPES.forEach((type) => {
      const option = document.createElement("option");
      option.value = type.value;
      option.textContent =
        type.labels[currentLanguage] || type.labels[DEFAULT_LANGUAGE];
      vehicleTypeSelect.appendChild(option);
    });
    if (selectedValue) {
      vehicleTypeSelect.value = selectedValue;
    }
  };

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

  const enforceInsuranceExpiration = () => {
    if (!seasonSelect || !insuranceExpirationInput) return;
    const seasonData = SEASON_LOOKUP[seasonSelect.value];
    if (!seasonData || !seasonData.pickupDeadline) {
      insuranceExpirationInput.min = "";
      return;
    }
    const pickupText = getLocalizedText(seasonData.pickupDeadline, "en");
    const parsedDate = pickupText
      .replace(/(\d{1,2})\s([A-Za-z]+)\s(\d{4})/, "$2 $1, $3")
      .replace(/(\d{1,2})(er)?\s([^.\s]+)\.?(?:\s)?(\d{4})/, "$3 $1, $4");
    const baseDate = new Date(parsedDate);
    if (Number.isNaN(baseDate.getTime())) {
      insuranceExpirationInput.min = "";
      return;
    }
    baseDate.setDate(baseDate.getDate() + 30);
    const yyyy = baseDate.getFullYear();
    const mm = String(baseDate.getMonth() + 1).padStart(2, "0");
    const dd = String(baseDate.getDate()).padStart(2, "0");
    insuranceExpirationInput.min = `${yyyy}-${mm}-${dd}`;
  };

  const updateLeaseDuration = () => {
    if (!seasonSelect || !leaseDurationInput) return;
    const seasonInfo = SEASON_LOOKUP[seasonSelect.value];
    leaseDurationInput.value = seasonInfo
      ? getLocalizedText(seasonInfo.duration)
      : "";
  };
  const updateEstimatedCost = () => {
    if (!leaseCostInput) return;
    const formValues = Object.fromEntries(new FormData(form).entries());
    const estimate = estimateRentalCost(formValues);
    leaseCostInput.value = estimate;
    const numericEstimate = parseCurrencyValue(estimate);
    if (numericEstimate === null) {
      leaseCostInput.value = "";
    }
    applyDepositRule(estimate);
  };
  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      updateLeaseDuration();
      updateEstimatedCost();
      enforceInsuranceExpiration();
    });
    enforceInsuranceExpiration();
  }

  const vehicleTypeOther = document.getElementById("vehicle-type-other");
  const updateLengthRequirement = () => {
    if (!vehicleLengthInput || !vehicleTypeSelect) return;
    const requiresLength = LENGTH_REQUIRED_TYPES.has(vehicleTypeSelect.value);
    vehicleLengthInput.required = Boolean(requiresLength);
  };
  const updatePropaneAvailability = () => {
    if (!propaneCheckbox || !vehicleTypeSelect) return;
    const isRv = vehicleTypeSelect.value === "RV/Motorhome";
    propaneCheckbox.disabled = !isRv;
    const label = propaneCheckbox.closest("label");
    if (label) {
      label.classList.toggle("disabled", !isRv);
    }
    if (!isRv && propaneCheckbox.checked) {
      propaneCheckbox.checked = false;
      updateEstimatedCost();
      saveFormMemory();
    }
  };
  if (vehicleTypeSelect && vehicleTypeOther) {
    const toggleOther = () => {
      const isOther = vehicleTypeSelect.value === "Other";
      vehicleTypeOther.classList.toggle("hidden", !isOther);
      const input = vehicleTypeOther.querySelector("input");
      if (input) {
        input.required = isOther;
      }
      updateEstimatedCost();
      updateLengthRequirement();
      updatePropaneAvailability();
    };
    vehicleTypeSelect.addEventListener("change", toggleOther);
    toggleOther();
  }

  const serviceCheckboxes = [
    form.querySelector('input[name="battery"]'),
    propaneCheckbox,
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
      applyFormMemory(vehicleTypeSelect.value);
      updateLengthRequirement();
      updatePropaneAvailability();
      updateEstimatedCost();
      saveFormMemory();
    });
    updateLengthRequirement();
    updatePropaneAvailability();
  }

  const resetVehicleButton = form.querySelector("[data-reset-vehicle]");
  const clearVehicleMemory = () => {
    const currentType = vehicleTypeSelect?.value;
    const storageKey = getVehicleStorageKey(currentType);
    if (storageKey && window.localStorage) {
      try {
        window.localStorage.removeItem(storageKey);
      } catch (err) {}
    }
    isApplyingFormMemory = true;
    CONTRACT_FORM_MEMORY_FIELDS.forEach((name) => {
      if (name === "vehicleType") return;
      const field = form.elements[name];
      if (!field) return;
      if (field.type === "checkbox") {
        field.checked = false;
      } else {
        field.value = "";
      }
    });
    isApplyingFormMemory = false;
    if (vehicleTypeOther) {
      const isOther = vehicleTypeSelect?.value === "Other";
      vehicleTypeOther.classList.toggle("hidden", !isOther);
    }
    updateLengthRequirement();
    updatePropaneAvailability();
    updateEstimatedCost();
  };
  if (resetVehicleButton) {
    resetVehicleButton.addEventListener("click", () => {
      clearVehicleMemory();
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

  CONTRACT_FORM_MEMORY_FIELDS.forEach((name) => {
    const field = form.elements[name];
    if (!field) return;
    const handler = () => saveFormMemory();
    field.addEventListener("change", handler);
    if (field.tagName === "INPUT" && field.type !== "checkbox") {
      field.addEventListener("input", handler);
    }
  });

  populateSeasonSelect();
  populateVehicleTypeOptions();
  applyFormMemory();
  updateLengthRequirement();
  updatePropaneAvailability();
  updateLeaseDuration();
  updateEstimatedCost();

  syncContractHelperLanguage = () => {
    populateSeasonSelect();
    populateVehicleTypeOptions();
    applyFormMemory();
    updateLengthRequirement();
    updatePropaneAvailability();
    updateLeaseDuration();
    updateEstimatedCost();
  };
};

const populateServicePrices = () => {
  if (!servicePriceEls.length) return;
  servicePriceEls.forEach((el) => {
    const key = el.dataset.servicePrice;
    const amount = SERVICE_PRICES[key];
    if (typeof amount === "number") {
      el.textContent = formatCurrency(amount);
    }
  });
};

const updateContractDownloadLink = () => {
  if (!contractDownloadLink) return;
  const url = getContractTemplateUrl();
  contractDownloadLink.href = url;
  const filename = url.split("/").pop();
  if (filename) {
    contractDownloadLink.download = filename;
  }
};

const updateContactEmails = () => {
  const email = getContactEmail();
  if (!email) return;
  const anchors = document.querySelectorAll("[data-contact-email]");
  anchors.forEach((anchor) => {
    anchor.href = `mailto:${email}`;
    anchor.textContent = email;
  });
};

const handleContactForm = () => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nameInput = (data.get("name") || "").trim();
    const email = (data.get("email") || "").trim();
    const vehicleInput = (data.get("vehicle") || "").trim();
    const message = (data.get("message") || "").trim();
    const readableName =
      nameInput || getTranslation("contactForm.inquiryFallback");
    const vehicleDisplay =
      vehicleInput || getTranslation("contactForm.vehicleFallback");

    const subjectTemplate = getTranslation("contactForm.subject");
    const subject = encodeURIComponent(
      formatTemplate(subjectTemplate, { name: readableName }),
    );
    const bodyLines = [
      `${getTranslation("contactForm.bodyName")}: ${readableName}`,
      `${getTranslation("contactForm.bodyEmail")}: ${email}`,
      `${getTranslation("contactForm.bodyVehicle")}: ${vehicleDisplay}`,
      "",
      message,
    ];

    const body = encodeURIComponent(bodyLines.join("\n"));
    window.location.href = `mailto:${getContactEmail()}?subject=${subject}&body=${body}`;
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
    if (previewModal) {
      previewModal.addEventListener("click", (event) => {
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
      previewStatus.textContent = formatTemplate(
        getTranslation("modal.readyStatus"),
        { filename },
      );
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

  if (previewDownloadBtn) {
    previewDownloadBtn.addEventListener("click", () => {
      if (!previewUrl) return;
      triggerDownload(previewUrl, previewFilename);
      closePreview();
    });
  }

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
  if (previewModal) {
    previewModal.addEventListener("click", (event) => {
      if (event.target === previewModal) {
        closePreview();
      }
    });
  }

  window.addEventListener("beforeunload", cleanupPreviewUrl);
  updatePreviewActions(false);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEntries = new FormData(form);
    formEntries.set("formLanguage", currentLanguage);
    const formData = Object.fromEntries(formEntries.entries());
    try {
      const payload = await generateContractPdf(formData);
      showPreview(payload);
    } catch (err) {
      console.error("Unable to generate PDF", err);
      alert(getMessage("messages.pdfError"));
    }
  });
};

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
  const preferredLanguage =
    data.formLanguage && SUPPORTED_LANGUAGES.includes(data.formLanguage)
      ? data.formLanguage
      : currentLanguage;
  const templateUrl = getContractTemplateUrl(preferredLanguage);
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error("Unable to load the contract template PDF.");
  }
  const templateBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const formLanguage = preferredLanguage || DEFAULT_LANGUAGE;

  const updateAppearance = (field, force = false) => {
    if (!field || !force) return;
    try {
      field.updateAppearances(helvetica);
    } catch (err) {
      const fieldName =
        typeof field.getName === "function" ? field.getName() : "unknown";
      console.warn(
        `Unable to update appearance for ${fieldName}`,
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

  const pdfSeasonLabel =
    getSeasonLabelForLanguage(data.season, formLanguage) ||
    getSeasonLabelForLanguage(data.season, DEFAULT_LANGUAGE) ||
    "";
  const pdfVehicleLabel =
    getVehicleLabelForLanguage(data.vehicleType, formLanguage) ||
    data.vehicleType ||
    "";

  setDropdownField("season", pdfSeasonLabel || data.season || "");
  setTextField("tenantName", data.tenantName || "");
  setTextField("tenantPhone", formattedPhone);
  setTextField("tenantEmail", data.tenantEmail || "");
  setTextField("tenantAddress", tenantAddressLine);
  setDropdownField("vehicleType", pdfVehicleLabel);
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
  setTextField("leaseCost", estimatedAmount ? formatPdfCurrency(estimatedAmount) : "");
  setTextField(
    "deposit",
    depositValue ? formatPdfCurrency(depositValue) : "",
  );
  setTextField(
    "service Cost",
    servicesTotal ? formatPdfCurrency(servicesTotal) : "",
  );
  setTextField(
    "remaining",
    remainingAmount ? formatPdfCurrency(remainingAmount) : "",
  );
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

const seasonWindow = (seasonValue = "") => {
  let season = SEASON_LOOKUP[seasonValue];
  if (!season) {
    season = findSeasonByLabel(String(seasonValue || ""));
  }

  if (!season) {
    return getMessage("messages.seasonWindowFallback");
  }

  const dropoff =
    getLocalizedText(season.dropoffWindow) ||
    getLocalizedText(season.timeframe).split("–")[0].trim();
  const pickup = getLocalizedText(season.pickupDeadline);
  return formatTemplate(getMessage("messages.seasonWindow"), {
    dropoff,
    pickup,
  });
};

const applyTranslationsForLanguage = (lang) => {
  const elements = document.querySelectorAll("[data-i18n]");
  elements.forEach((el) => {
    const key = el.dataset.i18n;
    const translation = getTranslation(key, lang);
    if (!translation) return;
    const attrTargets = el.dataset.i18nAttr
      ? el.dataset.i18nAttr
          .split(",")
          .map((attr) => attr.trim())
          .filter(Boolean)
      : [];
    if (attrTargets.length) {
      attrTargets.forEach((attr) => el.setAttribute(attr, translation));
      return;
    }
    if (el.dataset.i18nHtml === "true") {
      el.innerHTML = translation;
      return;
    }
    el.textContent = translation;
  });
};

const updateLanguageToggleState = () => {
  const buttons = document.querySelectorAll("[data-lang-toggle]");
  buttons.forEach((btn) => {
    const lang = btn.dataset.langToggle;
    btn.classList.toggle("active", lang === currentLanguage);
  });
};

const syncUrlLanguageParam = (lang) => {
  if (!window.history || !window.URLSearchParams) return;
  const url = new URL(window.location.href);
  if (url.searchParams.get("lang") === lang) return;
  url.searchParams.set("lang", lang);
  window.history.replaceState({}, "", url.toString());
};

const applyLanguage = (lang, { skipPersist, skipUrlSync } = {}) => {
  const normalized = SUPPORTED_LANGUAGES.includes(lang)
    ? lang
    : DEFAULT_LANGUAGE;
  currentLanguage = normalized;
  document.documentElement.lang = currentLanguage;
  if (!skipPersist) {
    try {
      window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    } catch (err) {}
  }
  applyTranslationsForLanguage(currentLanguage);
  buildSeasonCards();
  buildStorageRules();
  populateServicePrices();
  updateContractDownloadLink();
  updateContactEmails();
  syncContractHelperLanguage();
  updateLanguageToggleState();
  if (!skipUrlSync) {
    syncUrlLanguageParam(currentLanguage);
  }
};

const initLanguageToggle = () => {
  const buttons = document.querySelectorAll("[data-lang-toggle]");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.langToggle;
      if (!lang || lang === currentLanguage) return;
      applyLanguage(lang);
    });
  });
};

const getStoredLanguage = () => {
  try {
    const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
    const normalized = stored ? stored.toLowerCase() : null;
    if (normalized && SUPPORTED_LANGUAGES.includes(normalized)) {
      return normalized;
    }
  } catch (err) {}
  return null;
};

const getLanguageFromHostname = () => {
  const hostname = (window.location.hostname || "").toLowerCase();
  if (!hostname) return null;
  if (hostname.includes("entrepot")) {
    return "fr";
  }
  if (hostname.includes("warehouse")) {
    return "en";
  }
  return null;
};

const getLanguageFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get("lang");
    const normalizedQuery = queryLang ? queryLang.toLowerCase() : null;
    if (normalizedQuery && SUPPORTED_LANGUAGES.includes(normalizedQuery)) {
      return normalizedQuery;
    }
  } catch (err) {}
  const hash = (window.location.hash || "").replace(/^#/, "");
  const normalizedHash = hash ? hash.toLowerCase() : null;
  if (normalizedHash && SUPPORTED_LANGUAGES.includes(normalizedHash)) {
    return normalizedHash;
  }
  return null;
};

document.addEventListener("DOMContentLoaded", () => {
  initFormStepper();
  handleContactForm();
  handleContractHelper();
  const urlLanguage = getLanguageFromUrl();
  const storedLanguage = getStoredLanguage();
  const hostLanguage = getLanguageFromHostname();
  const initialLanguage =
    urlLanguage || storedLanguage || hostLanguage || DEFAULT_LANGUAGE;
  applyLanguage(initialLanguage, {
    skipPersist: Boolean(urlLanguage),
    skipUrlSync: Boolean(urlLanguage || hostLanguage),
  });
  initLanguageToggle();
});
