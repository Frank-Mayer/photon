export function hash(
  value: string | { toString: () => string },
  allowNegative = false
) {
  const str = typeof value == "string" ? value : value.toString();
  var hash = 0;
  if (str.length == 0) {
    return hash;
  }

  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  if (allowNegative) {
    return hash;
  } else {
    return hash + 0x80000000;
  }
}

export async function hashAsync(value: string | { toString: () => string }) {
  let hash = 0;
  new Uint32Array(
    await crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(
        typeof value == "string" ? value : value.toString()
      )
    )
  ).forEach((val) => {
    hash << 32;
    hash += val;
  });
  return hash;
}
