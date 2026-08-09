export type SampleCustomer = {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "Active" | "At risk" | "Churned";
  plan: string;
  since: string;
  openTickets: number;
  lastActivity: string;
  region: string;
};

export type SampleTicket = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  issue: string;
  priority: "Low" | "Normal" | "High" | "Urgent";
  status: "Open" | "Pending" | "Resolved" | "Closed";
  assigned: string;
  updated: string;
  created: string;
};

export type SampleArticle = {
  id: string;
  title: string;
  category: string;
  status: "Verified" | "Draft";
  updated: string;
  usedByAi: number;
  summary: string;
};

export const CUSTOMERS: SampleCustomer[] = [
  {
    id: "cus_jordan",
    name: "Jordan Miller",
    email: "jordan.miller@example.com",
    company: "Northwind Logistics",
    status: "Active",
    plan: "Enterprise",
    since: "Jan 2025",
    openTickets: 1,
    lastActivity: "2 min ago",
    region: "North America",
  },
  {
    id: "cus_ava",
    name: "Ava Chen",
    email: "ava.chen@brightline.io",
    company: "Brightline Labs",
    status: "Active",
    plan: "Business",
    since: "Mar 2025",
    openTickets: 0,
    lastActivity: "1 hour ago",
    region: "APAC",
  },
  {
    id: "cus_marcus",
    name: "Marcus Reed",
    email: "m.reed@harborco.com",
    company: "Harbor Co",
    status: "At risk",
    plan: "Enterprise",
    since: "Sep 2024",
    openTickets: 2,
    lastActivity: "Yesterday",
    region: "EMEA",
  },
  {
    id: "cus_sofia",
    name: "Sofia Alvarez",
    email: "sofia@peakstack.dev",
    company: "Peakstack",
    status: "Active",
    plan: "Starter",
    since: "Nov 2025",
    openTickets: 0,
    lastActivity: "3 days ago",
    region: "LATAM",
  },
];

export const TICKETS: SampleTicket[] = [
  {
    id: "SUP-1024",
    customerId: "cus_jordan",
    customerName: "Jordan Miller",
    customerEmail: "jordan.miller@example.com",
    subject: "Device showing Error E102",
    issue: "Error E102",
    priority: "High",
    status: "Open",
    assigned: "Technical Support",
    updated: "2 min ago",
    created: "Today, 11:42 AM",
  },
  {
    id: "SUP-1019",
    customerId: "cus_marcus",
    customerName: "Marcus Reed",
    customerEmail: "m.reed@harborco.com",
    subject: "Firmware update stuck at 47%",
    issue: "Firmware stall",
    priority: "Urgent",
    status: "Pending",
    assigned: "Firmware Team",
    updated: "28 min ago",
    created: "Today, 9:05 AM",
  },
  {
    id: "SUP-1011",
    customerId: "cus_ava",
    customerName: "Ava Chen",
    customerEmail: "ava.chen@brightline.io",
    subject: "LED meanings on Hub Pro",
    issue: "Product question",
    priority: "Low",
    status: "Resolved",
    assigned: "ResolveAI",
    updated: "Yesterday",
    created: "Yesterday, 4:18 PM",
  },
  {
    id: "SUP-1004",
    customerId: "cus_marcus",
    customerName: "Marcus Reed",
    customerEmail: "m.reed@harborco.com",
    subject: "Dashboard access lockout",
    issue: "Account access",
    priority: "Normal",
    status: "Open",
    assigned: "Account Support",
    updated: "Yesterday",
    created: "Mon, 2:40 PM",
  },
];

export const ARTICLES: SampleArticle[] = [
  {
    id: "KB-ERR-114",
    title: "E-NET-14 — Network Connectivity Issue",
    category: "Network",
    status: "Verified",
    updated: "Today",
    usedByAi: 24,
    summary: "DHCP lease renewal failures and intermittent offline gaps.",
  },
  {
    id: "KB-FW-014",
    title: "Firmware update stuck mid-install",
    category: "Firmware",
    status: "Verified",
    updated: "2 days ago",
    usedByAi: 18,
    summary: "Recovery steps when firmware stalls around 40–50%.",
  },
  {
    id: "KB-FAQ-010",
    title: "Hub LED color meanings",
    category: "Troubleshooting",
    status: "Verified",
    updated: "Last week",
    usedByAi: 41,
    summary: "Solid green, blinking amber, setup blue, firmware pulse.",
  },
  {
    id: "KB-INS-021",
    title: "Pairing fails during installation",
    category: "Installation",
    status: "Verified",
    updated: "Last week",
    usedByAi: 12,
    summary: "Bluetooth pairing and claim/unclaim workflow.",
  },
  {
    id: "KB-ACC-008",
    title: "Dashboard login and seat assignment",
    category: "Account",
    status: "Verified",
    updated: "3 weeks ago",
    usedByAi: 9,
    summary: "Lockouts, MFA, and member seat checks.",
  },
  {
    id: "KB-RST-003",
    title: "Safe restart procedure",
    category: "Troubleshooting",
    status: "Draft",
    updated: "Today",
    usedByAi: 7,
    summary: "Soft restart vs power cycle guidance.",
  },
];

export const DEFAULT_CUSTOMER = CUSTOMERS[0];

export function getCustomer(id: string) {
  return CUSTOMERS.find((c) => c.id === id);
}

export function getTicket(id: string) {
  return TICKETS.find((t) => t.id === id);
}
