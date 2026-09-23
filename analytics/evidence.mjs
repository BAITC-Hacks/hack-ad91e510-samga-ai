import {measures} from '../docs/brief-analysis/dist/data.mjs';
export const evidenceCards=[
  {
    "id": "wb-mobility",
    "title": "Городская мобильность: результаты транспортных проектов",
    "publisher": "World Bank",
    "published": "2024-03-13",
    "url": "https://www.worldbank.org/en/results/2024/03/13/promoting-livable-cities-by-investing-in-urban-mobility",
    "measureIds": [
      "M1",
      "M3"
    ],
    "summary": "Транспортные проекты могут улучшать доступность и сокращать время поездки; результаты зависят от конкретного коридора и устройства системы.",
    "limit": "Результаты BRT нельзя переносить на отдельную автобусную полосу или ЛРТ в Астане без местной модели спроса."
  },
  {
    "id": "who-green",
    "title": "Озеленение и здоровье: обзор доказательств",
    "publisher": "WHO Europe",
    "published": "2016",
    "url": "https://www.who.int/europe/publications/i/item/WHO-EURO-2016-3352-43111-60341",
    "measureIds": [
      "M4",
      "M6"
    ],
    "summary": "Обзор описывает связи зелёных пространств с физической активностью, снижением стресса и воздействием факторов окружающей среды.",
    "limit": "Это обоснование механизма, а не коэффициент прироста баллов и не оценка размера эффекта для выбранного района."
  },
  {
    "id": "who-road",
    "title": "Безопасность дорожного движения",
    "publisher": "WHO",
    "published": null,
    "url": "https://www.who.int/health-topics/road-safety",
    "measureIds": [
      "M11"
    ],
    "summary": "Снижение рисков дорожного движения связано со скоростью, безопасной инфраструктурой и защитой уязвимых участников.",
    "limit": "Число предотвращённых ДТП нельзя вывести из учебного показателя B2 без местных данных."
  },
  {
    "id": "wb-water",
    "title": "Результативность водоснабжающих организаций",
    "publisher": "World Bank",
    "published": null,
    "url": "https://www.worldbank.org/en/topic/water/publication/performance-of-water-utilities-in-africa",
    "measureIds": [
      "M13",
      "M14"
    ],
    "summary": "В отчёте рассматриваются рост спроса, обслуживание стареющей инфраструктуры и различия результативности водоснабжающих организаций.",
    "limit": "Контекст водоснабжения африканских стран. Применимость к отоплению и аварийным бригадам Астаны требует отдельной проверки."
  },
  {
    "id": "oecd-services",
    "title": "Государственные услуги, ориентированные на человека",
    "publisher": "OECD",
    "published": "2026",
    "url": "https://www.oecd.org/en/publications/digital-government-outlook_0496b2bc-en/full-report/building-human-centred-and-proactive-government-services-in-the-digital-age_7cc9d8c5.html",
    "measureIds": [
      "M12"
    ],
    "summary": "Глава рассматривает обратную связь пользователей и использование данных о работе услуг для улучшения государственных сервисов.",
    "limit": "Рекомендации по организации услуг не определяют прирост показателя C2 и не доказывают, что одной платформы достаточно."
  },
  {
    "id": "wb-school",
    "title": "Влияние школьной инфраструктуры на обучение",
    "publisher": "World Bank",
    "published": "2019",
    "url": "https://documents.worldbank.org/en/publication/documents-reports/documentdetail/853821543501252792/",
    "measureIds": [
      "M7"
    ],
    "summary": "Синтез исследований рассматривает связь школьной среды с обучением и параметры планирования образовательной инфраструктуры.",
    "limit": "Доступность мест и качество обучения — разные результаты; стоимость и кадровое обеспечение требуют местных данных."
  },
  {
    "id": "who-primary",
    "title": "Измерение первичной медико-санитарной помощи",
    "publisher": "WHO",
    "published": null,
    "url": "https://www.who.int/teams/integrated-health-services/health-services-performance-assessment/phc-measurement-framework-and-indicators",
    "measureIds": [
      "M8"
    ],
    "summary": "Система показателей связывает ресурсы и организацию первичной помощи, включая инфраструктуру и медицинские кадры, с результатами работы системы.",
    "limit": "Открытие здания не задаёт само по себе эффект для здоровья. Нужны данные о персонале, доступности и качестве помощи."
  },
  {
    "id": "who-fuels",
    "title": "Чистые виды топлива и бытовое загрязнение воздуха",
    "publisher": "WHO",
    "published": null,
    "url": "https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health",
    "measureIds": [
      "M5"
    ],
    "summary": "Рекомендации рассматривают переход на более чистые технологии бытового энергоснабжения, включая приготовление пищи, отопление и освещение.",
    "limit": "Снижение воздействия внутри помещений не равно заданному приросту городского E2. Требуется местная оценка выбросов и экспозиции."
  }
].map(c=>({...c,reviewedAt:'2026-09-23',relationship:'context',usedAsCoefficient:false}));
export function evidenceFor(ids){
 if(!Array.isArray(ids)||ids.some(id=>!measures.some(m=>m.id===id)))throw new Error('INVALID_MEASURE');
 const cards=evidenceCards.filter(c=>c.measureIds.some(id=>ids.includes(id)));
 return {cards,gaps:ids.filter(id=>!cards.some(c=>c.measureIds.includes(id))),
 notice:'Источники поясняют механизмы и ограничения. Они не калибруют численные коэффициенты учебной модели.'};
}
