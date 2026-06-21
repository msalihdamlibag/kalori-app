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

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "API anahtarı geçersiz. Lütfen ayarları kontrol edin." },
          { status: 500 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin." },
          { status: 429 }
        );
      }
      if (error.status === 529) {
        return NextResponse.json(
          { error: "AI servisi şu anda meşgul. Lütfen birkaç dakika sonra tekrar deneyin." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: `AI servisi hatası (${error.status}). Lütfen daha sonra tekrar deneyin.` },
        { status: error.status || 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI yanıtı işlenemedi. Lütfen tekrar deneyin." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
