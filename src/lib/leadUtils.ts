function capitalizeWords(text: string): string {
  if (!text || text.length === 0) return text;
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getLeadDisplayName(lead: { name?: string; email?: string | null }): string {
  if (lead.name && lead.name.trim()) {
    return capitalizeWords(lead.name.trim());
  }
  if (lead.email && lead.email.trim()) {
    return lead.email;
  }
  return "Lead sem nome";
}

export function formatLeadName(name: string | null, email: string | null): string {
  if (name && name.trim()) {
    return capitalizeWords(name.trim());
  }
  return email || "Lead sem nome";
}