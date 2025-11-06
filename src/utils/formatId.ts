export function formatID(id: string) {
    const cleanId = id.includes(":") ? id.split(":")[1] : id;
    const name = cleanId.split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    return name;
}