export function formatId(id) {
    const cleanId = id.includes(":") ? id.split(":")[1] : id;
    const name = cleanId.split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    return name;
}
export function formatNumber(num) {
    if (num < 1000) {
        return num.toString();
    }
    const suffixes = ['', 'k', 'M', 'B', 'T'];
    const suffixNum = Math.floor(('' + num).length / 3);
    let shortValue = parseFloat((suffixNum !== 0 ? (num / Math.pow(1000, suffixNum)) : num).toPrecision(2));
    if (shortValue % 1 !== 0) {
        shortValue = parseFloat(shortValue.toFixed(1));
    }
    return shortValue + suffixes[suffixNum];
}
export function formatString(text, replacements) {
    let result = text;
    for (const key in replacements) {
        result = result.replaceAll(key, `${replacements[key]}`);
    }
    return result;
}
