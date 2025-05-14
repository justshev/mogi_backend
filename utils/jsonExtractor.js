export function extractJSON(text) {
  try {
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Tidak ditemukan JSON dalam respons");
    }
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(
      "Gagal mem-parsing JSON: " + err.message + "\nRaw output:\n" + text
    );
  }
}
