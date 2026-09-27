/**
 * Profile Completeness Validator
 * Validates that all required business details are filled for Buyers and Suppliers
 * before allowing auction creation or bid placement.
 */

export function getMissingProfileFields(user) {
  const missing = [];
  if (!user?.name || !user.name.trim()) {
    missing.push('Full Name');
  }
  if (!user?.companyName || !user.companyName.trim()) {
    missing.push('Company / Business Name');
  }
  const cleanPhone = (user?.phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    missing.push('10-digit Mobile Number');
  }
  if (!user?.location || !user.location.trim()) {
    missing.push('City / Business Location');
  }
  return missing;
}

export function isProfileComplete(user) {
  return getMissingProfileFields(user).length === 0;
}
