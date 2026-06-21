import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { excessCalories } = await req.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Günlük kalori limitimi ${excessCalories} kalori aştım. Bu fazla kaloriyi yakmak için egzersiz önerileri ver.

Yanıtını SADECE aşağıdaki JSON formatında ver:
{
  "exercises": [
    {
      "name": "egzersiz adı",
      "duration": "süre (dakika)",
      "caloriesBurned": yakılacak kalori,
      "intensity": "düşük" | "orta" | "yüksek",
      "description": "kısa açıklama"
    }
  ],
  "message": "motivasyon mesajı"
}

En az 3, en fazla 5 egzersiz öner. Farklı yoğunluklarda olsun.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Öneri oluşturulamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("Egzersiz önerisi hatası:", error);
    return NextResponse.json({ error: "Hata oluştu" }, { status: 500 });
  }
}
