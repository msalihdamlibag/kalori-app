import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API anahtarı yapılandırılmamış" },
        { status: 500 }
      );
    }

    const client = new Anthropic();
    const { ingredients, remainingCalories } = await req.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Elimdeki malzemeler: ${ingredients}
${remainingCalories ? `Günlük kalan kalori bütçem: ${remainingCalories} kcal` : ""}

Bu malzemelerle yapılabilecek sağlıklı yemek tarifleri öner.${remainingCalories ? " Kalori bütçemi aşmayan tarifler tercih et." : ""}

Yanıtını SADECE aşağıdaki JSON formatında ver:
{
  "recipes": [
    {
      "name": "yemek adı",
      "calories": porsiyon başı kalori,
      "prepTime": "hazırlık süresi",
      "ingredients": ["malzeme 1", "malzeme 2"],
      "steps": ["adım 1", "adım 2"],
      "nutritionNote": "beslenme notu"
    }
  ]
}

En az 2, en fazla 4 tarif öner. Pratik ve sağlıklı tarifler olsun.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Tarif oluşturulamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Tarif önerisi hatası:", error);
    return NextResponse.json({ error: "Hata oluştu" }, { status: 500 });
  }
}
