type PhoneParts = {
  normalized: string;
  cursorAdjust: number;
};

export function normalizePakistaniPhone(
  input: string,
  cursorPos: number,
): PhoneParts {
  const before = input.slice(0, cursorPos);
  const after = input.slice(cursorPos);

  const cleaned = input.replace(/[^0-9+]/g, "");
  if (cleaned === input) {
    return { normalized: input, cursorAdjust: 0 };
  }

  const removedCount = input.length - cleaned.length;
  let newCursor = cursorPos;
  for (let i = 0; i < cursorPos; i++) {
    if (/[^0-9+]/.test(input[i])) {
      newCursor--;
    }
  }

  let normalized: string;
  if (cleaned.startsWith("+92")) {
    normalized = "0" + cleaned.slice(3);
    if (before.startsWith("+92")) {
      newCursor = Math.max(0, newCursor - 2);
    }
  } else if (cleaned.startsWith("0092")) {
    normalized = "0" + cleaned.slice(4);
    if (before.startsWith("0092")) {
      newCursor = Math.max(0, newCursor - 3);
    }
  } else if (cleaned.startsWith("92") && cleaned.length >= 12) {
    normalized = "0" + cleaned.slice(2);
    newCursor = Math.max(0, newCursor - 1);
  } else if (cleaned.startsWith("3") && cleaned.length <= 11) {
    normalized = "0" + cleaned;
    newCursor = Math.max(0, newCursor + 1);
  } else {
    normalized = cleaned;
  }

  if (normalized.length > 11) {
    normalized = normalized.slice(0, 11);
    newCursor = Math.min(newCursor, 11);
  }

  return { normalized, cursorAdjust: newCursor - cursorPos + removedCount };
}

export function normalizePakistaniPhoneOnBlur(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) {
    return "0" + digits.slice(2);
  }
  if (digits.startsWith("3") && digits.length === 10) {
    return "0" + digits;
  }
  if (digits.startsWith("03") && digits.length === 11) {
    return digits;
  }
  return digits;
}

export function formatPakistaniPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("03")) {
    return `03${digits.slice(2, 5)}-${digits.slice(5, 8)}${digits.slice(8)}`;
  }
  return phone;
}

export function isValidPakistaniPhone(phone: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("03");
}
