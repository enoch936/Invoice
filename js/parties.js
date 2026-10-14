// Shared helpers for structured supplier / customer details on invoices and quotations.
// Keeps the two builders consistent: the same fields, the same country list, the same preview output.

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria",
  "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo (Republic of the)", "Congo (Democratic Republic of the)",
  "Costa Rica", "Côte d'Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Djibouti", "Dominica",
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
  "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
  "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino",
  "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
  "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain",
  "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export const PARTY_FIELDS = ["address", "city", "country", "email", "phone", "tax"];

// Fill every <select data-country> inside root with options, preserving any current value.
export function populateCountrySelects(root = document) {
  for (const select of root.querySelectorAll("select[data-country]")) {
    if (select.dataset.populated === "true") continue;
    const current = select.value;
    for (const name of COUNTRIES) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.append(option);
    }
    if (current) select.value = current;
    select.dataset.populated = "true";
  }
}

// Read a party's fields from the form; prefix is "business" or "client".
export function readParty(form, prefix) {
  const party = {};
  for (const key of PARTY_FIELDS) {
    const field = form.elements.namedItem(`${prefix}-${key}`);
    party[key] = field ? String(field.value).trim() : "";
  }
  return party;
}

// Restore a party's fields into the form.
export function fillParty(form, prefix, party) {
  for (const key of PARTY_FIELDS) {
    const field = form.elements.namedItem(`${prefix}-${key}`);
    if (!field) continue;
    field.value = party && typeof party[key] === "string" ? party[key] : "";
  }
}

// Collapse a party object into the printable address / contact / tax lines.
export function partyLines(party) {
  if (!party || typeof party !== "object") return { address: "", contact: "", tax: "" };
  const clean = (value) => (typeof value === "string" ? value.trim() : "");
  const address = [clean(party.address), clean(party.city), clean(party.country)].filter(Boolean).join(", ");
  const contact = [clean(party.email), clean(party.phone)].filter(Boolean).join(" · ");
  const tax = clean(party.tax);
  return { address, contact, tax: tax ? `Tax ID: ${tax}` : "" };
}

// Write a party's lines into <p id="{idPrefix}-address|contact|tax">, hiding empty ones.
export function renderParty(idPrefix, party) {
  const { address, contact, tax } = partyLines(party);
  const put = (suffix, text) => {
    const node = document.getElementById(`${idPrefix}${suffix}`);
    if (!node) return;
    if (text) {
      node.textContent = text;
      node.hidden = false;
    } else {
      node.textContent = "";
      node.hidden = true;
    }
  };
  put("-address", address);
  put("-contact", contact);
  put("-tax", tax);
}

// Defensive copy used before embedding a party in a share link.
export function sanitizeParty(party) {
  const slice = (value, max) => String(value ?? "").slice(0, max);
  if (!party || typeof party !== "object") return { address: "", city: "", country: "", email: "", phone: "", tax: "" };
  return {
    address: slice(party.address, 200),
    city: slice(party.city, 80),
    country: slice(party.country, 60),
    email: slice(party.email, 120),
    phone: slice(party.phone, 40),
    tax: slice(party.tax, 60)
  };
}
