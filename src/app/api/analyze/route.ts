// app/api/analyze/route.ts
import { NextResponse } from "next/server";

// Type for NER response from Hugging Face
interface NEREntity {
  entity_group: string;
  word: string;
  score: number;
  start: number;
  end: number;
}

// 1. Hugging Face API Configuration
// Get your free token here: https://huggingface.co/settings/tokens
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL_URL =
  "https://api-inference.huggingface.co/models/chambliss/distilbert-for-food-extraction";

// 2. USDA API Configuration
const USDA_API_KEY = process.env.USDA_API_KEY;
const USDA_ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";

// Helper to call Hugging Face Inference API directly
async function callHuggingFaceNER(text: string): Promise<NEREntity[]> {
  const response = await fetch(HF_MODEL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    // --- STEP A: AI Extraction (Find the food) ---
    // We use the same model as the Python version, just via direct fetch
    const aiResponse = await callHuggingFaceNER(text);

    // The AI returns a messy list of tokens. We need to clean it.
    // Filter only for 'FOOD' entities and join them (e.g. "greek", "yogurt" -> "greek yogurt")
    // Note: This is a simplified parser. Real NER parsing is trickier, but this works for a demo.
    const foodNames = aiResponse
      .filter((item) => item.entity_group === "FOOD")
      .map((item) => item.word)
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    if (foodNames.length === 0) {
      return NextResponse.json({ message: "No food found.", data: [] });
    }

    // --- STEP B: USDA Lookup (Get the calories) ---
    const results = [];

    for (const food of foodNames) {
      // Clean up the word (sometimes AI leaves ## symbols)
      const cleanFood = food.replace(/#/g, "");

      const usdaUrl = `${USDA_ENDPOINT}?query=${cleanFood}&api_key=${USDA_API_KEY}&pageSize=1`;
      const usdaRes = await fetch(usdaUrl);
      const usdaData = await usdaRes.json();

      let calories = "Unknown";
      let protein = "Unknown";

      if (usdaData.foods && usdaData.foods.length > 0) {
        const bestMatch = usdaData.foods[0];

        // Find Calories (Nutrient ID 208) and Protein (Nutrient ID 203)
        const calNutrient = bestMatch.foodNutrients.find(
          (n: any) => n.nutrientNumber === "208"
        );
        const protNutrient = bestMatch.foodNutrients.find(
          (n: any) => n.nutrientNumber === "203"
        );

        if (calNutrient)
          calories = `${calNutrient.value} ${calNutrient.unitName}`;
        if (protNutrient)
          protein = `${protNutrient.value} ${protNutrient.unitName}`;
      }

      results.push({
        food: cleanFood,
        calories: calories,
        protein: protein,
      });
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
