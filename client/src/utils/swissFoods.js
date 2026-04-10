/* ─────────────────────────────────────────────────────────────
   Curated Swiss + common foods database.
   Each entry is nutrition per 100g (solids) or per 100ml (liquids).
   Used as a first-pass offline / fuzzy search before hitting the
   Open Food Facts API. Having local data means typos still match.
   ───────────────────────────────────────────────────────────── */

export const SWISS_FOODS = [
  // ─── Swiss specialties (the ones the user cares about) ──────────
  { name: 'Eierspätzli', aliases: ['spätzle', 'spaetzle', 'eierspaetzli', 'egg noodles'], brand: 'Swiss', cal100: 160, prot100: 6, carb100: 28, fat100: 3, serving: '200g' },
  { name: 'Rösti', aliases: ['roesti', 'rosti', 'hash browns'], brand: 'Swiss', cal100: 160, prot100: 2, carb100: 20, fat100: 8, serving: '200g' },
  { name: 'Älplermagronen', aliases: ['alplermagronen', 'aelplermagronen', 'alpine macaroni'], brand: 'Swiss', cal100: 180, prot100: 7, carb100: 22, fat100: 7, serving: '250g' },
  { name: 'Zürcher Geschnetzeltes', aliases: ['zuercher geschnetzeltes', 'zurich style veal'], brand: 'Swiss', cal100: 180, prot100: 18, carb100: 3, fat100: 11, serving: '200g' },
  { name: 'Cervelat', aliases: ['servelat', 'swiss sausage'], brand: 'Swiss', cal100: 290, prot100: 12, carb100: 2, fat100: 26, serving: '100g' },
  { name: 'Bratwurst', aliases: ['swiss bratwurst', 'pork sausage'], brand: 'Swiss', cal100: 290, prot100: 13, carb100: 2, fat100: 25, serving: '120g' },
  { name: 'Raclette cheese', aliases: ['raclette', 'raclettekaese'], brand: 'Swiss', cal100: 360, prot100: 23, carb100: 0, fat100: 29, serving: '80g' },
  { name: 'Emmentaler', aliases: ['emmental', 'swiss cheese'], brand: 'Swiss', cal100: 380, prot100: 29, carb100: 0, fat100: 29, serving: '30g' },
  { name: 'Gruyère', aliases: ['gruyere', 'gruyerer'], brand: 'Swiss', cal100: 413, prot100: 30, carb100: 0, fat100: 32, serving: '30g' },
  { name: 'Appenzeller', aliases: ['appenzeller cheese'], brand: 'Swiss', cal100: 400, prot100: 29, carb100: 0, fat100: 31, serving: '30g' },
  { name: 'Tilsiter', aliases: ['tilsiter cheese'], brand: 'Swiss', cal100: 340, prot100: 25, carb100: 0, fat100: 26, serving: '30g' },
  { name: 'Fondue', aliases: ['cheese fondue', 'käse fondue'], brand: 'Swiss', cal100: 290, prot100: 15, carb100: 3, fat100: 23, serving: '200g' },
  { name: 'Birchermüesli', aliases: ['birchermuesli', 'bircher muesli'], brand: 'Swiss', cal100: 130, prot100: 4, carb100: 22, fat100: 3, serving: '200g' },

  // ─── Migros / Coop proteins ─────────────────────────────────────
  { name: 'Pouletbrust', aliases: ['chicken breast', 'poulet', 'pouletbrustfilet', 'hähnchenbrust'], brand: 'Migros', cal100: 110, prot100: 23, carb100: 0, fat100: 2, serving: '150g' },
  { name: 'Pouletschenkel', aliases: ['chicken thigh', 'hähnchenschenkel'], brand: 'Migros', cal100: 170, prot100: 19, carb100: 0, fat100: 10, serving: '150g' },
  { name: 'Rindshackfleisch', aliases: ['rinderhack', 'ground beef', 'beef mince'], brand: 'Migros', cal100: 170, prot100: 20, carb100: 0, fat100: 10, serving: '150g' },
  { name: 'Schweinefilet', aliases: ['pork tenderloin', 'schweinsfilet'], brand: 'Coop', cal100: 135, prot100: 22, carb100: 0, fat100: 5, serving: '150g' },
  { name: 'Rindsfilet', aliases: ['beef tenderloin', 'rinderfilet'], brand: 'Coop', cal100: 155, prot100: 22, carb100: 0, fat100: 7, serving: '150g' },
  { name: 'Lachsfilet', aliases: ['salmon fillet', 'lachs', 'salmon'], brand: 'Migros', cal100: 208, prot100: 20, carb100: 0, fat100: 13, serving: '150g' },
  { name: 'Thunfisch in Wasser', aliases: ['tuna in water', 'thunfisch wasser'], brand: 'Rio Mare', cal100: 110, prot100: 25, carb100: 0, fat100: 1, serving: '80g' },
  { name: 'Thunfisch in Öl', aliases: ['tuna in oil', 'thunfisch öl'], brand: 'Rio Mare', cal100: 190, prot100: 23, carb100: 0, fat100: 11, serving: '80g' },
  { name: 'Ei', aliases: ['egg', 'eier', 'eggs', 'chicken egg'], brand: '', cal100: 155, prot100: 13, carb100: 1, fat100: 11, serving: '60g' },
  { name: 'Eiweiss', aliases: ['egg white', 'egg whites', 'eiklar'], brand: '', cal100: 50, prot100: 11, carb100: 1, fat100: 0, serving: '100g' },

  // ─── Dairy ──────────────────────────────────────────────────────
  { name: 'Vollmilch', aliases: ['whole milk', 'milch', 'full fat milk'], brand: 'Migros', cal100: 64, prot100: 3.3, carb100: 4.7, fat100: 3.5, serving: '250ml' },
  { name: 'Magermilch', aliases: ['skimmed milk', 'skim milk', 'fat free milk'], brand: 'Migros', cal100: 35, prot100: 3.4, carb100: 4.8, fat100: 0.1, serving: '250ml' },
  { name: 'Griechischer Joghurt', aliases: ['greek yoghurt', 'greek yogurt', 'griechisches joghurt'], brand: 'Migros', cal100: 120, prot100: 9, carb100: 4, fat100: 8, serving: '150g' },
  { name: 'Magerquark', aliases: ['quark', 'low fat quark', 'magerer quark'], brand: 'Migros', cal100: 67, prot100: 12, carb100: 4, fat100: 0.2, serving: '250g' },
  { name: 'Hüttenkäse', aliases: ['cottage cheese', 'cottage käse'], brand: 'Migros', cal100: 98, prot100: 11, carb100: 3, fat100: 4.3, serving: '200g' },
  { name: 'Butter', aliases: ['swiss butter', 'butter normal'], brand: 'Migros', cal100: 720, prot100: 0.7, carb100: 0.7, fat100: 82, serving: '10g' },
  { name: 'Mozzarella', aliases: ['mozzarella cheese', 'mozarella'], brand: 'Galbani', cal100: 253, prot100: 18, carb100: 1, fat100: 19, serving: '125g' },
  { name: 'Parmesan', aliases: ['parmigiano', 'parmesan cheese'], brand: 'Parmigiano Reggiano', cal100: 392, prot100: 36, carb100: 0, fat100: 28, serving: '20g' },
  { name: 'Feta', aliases: ['feta cheese', 'feta käse'], brand: 'Dodoni', cal100: 264, prot100: 14, carb100: 4, fat100: 21, serving: '50g' },

  // ─── Carbs ─────────────────────────────────────────────────────
  { name: 'Reis (gekocht)', aliases: ['cooked rice', 'reis', 'white rice cooked', 'weisser reis'], brand: '', cal100: 130, prot100: 2.7, carb100: 28, fat100: 0.3, serving: '150g' },
  { name: 'Basmati Reis (gekocht)', aliases: ['basmati rice', 'basmati gekocht'], brand: '', cal100: 121, prot100: 3, carb100: 25, fat100: 0.4, serving: '150g' },
  { name: 'Vollkornreis (gekocht)', aliases: ['brown rice', 'whole grain rice', 'brauner reis'], brand: '', cal100: 112, prot100: 2.6, carb100: 23, fat100: 0.9, serving: '150g' },
  { name: 'Haferflocken', aliases: ['oats', 'oatmeal', 'rolled oats', 'hafer'], brand: 'Kellogg', cal100: 370, prot100: 13, carb100: 60, fat100: 7, serving: '50g' },
  { name: 'Müesli', aliases: ['muesli', 'mueesli'], brand: 'Kellogg', cal100: 360, prot100: 9, carb100: 66, fat100: 6, serving: '50g' },
  { name: 'Pasta (gekocht)', aliases: ['cooked pasta', 'spaghetti gekocht', 'nudeln'], brand: 'Barilla', cal100: 158, prot100: 5.8, carb100: 31, fat100: 0.9, serving: '200g' },
  { name: 'Vollkornbrot', aliases: ['wholegrain bread', 'whole wheat bread', 'vollkorn brot'], brand: 'Migros', cal100: 250, prot100: 9, carb100: 41, fat100: 4, serving: '50g' },
  { name: 'Zopf', aliases: ['swiss bread', 'zopfbrot', 'butterzopf'], brand: 'Migros', cal100: 320, prot100: 8, carb100: 55, fat100: 7, serving: '50g' },
  { name: 'Weissbrot', aliases: ['white bread', 'weiss brot'], brand: 'Migros', cal100: 265, prot100: 9, carb100: 49, fat100: 3, serving: '50g' },
  { name: 'Kartoffeln (gekocht)', aliases: ['cooked potato', 'kartoffel', 'potato boiled'], brand: '', cal100: 77, prot100: 2, carb100: 17, fat100: 0.1, serving: '200g' },
  { name: 'Süsskartoffeln', aliases: ['sweet potato', 'süsskartoffel'], brand: '', cal100: 86, prot100: 1.6, carb100: 20, fat100: 0.1, serving: '200g' },
  { name: 'Quinoa (gekocht)', aliases: ['cooked quinoa', 'kinoa'], brand: '', cal100: 120, prot100: 4.4, carb100: 21, fat100: 1.9, serving: '150g' },
  { name: 'Linsen (gekocht)', aliases: ['cooked lentils', 'lentils', 'linsen'], brand: '', cal100: 116, prot100: 9, carb100: 20, fat100: 0.4, serving: '150g' },
  { name: 'Kichererbsen', aliases: ['chickpeas', 'garbanzo'], brand: '', cal100: 164, prot100: 9, carb100: 27, fat100: 2.6, serving: '150g' },

  // ─── Veggies & fruit ───────────────────────────────────────────
  { name: 'Brokkoli', aliases: ['broccoli', 'brokoli'], brand: '', cal100: 34, prot100: 2.8, carb100: 7, fat100: 0.4, serving: '150g' },
  { name: 'Karotten', aliases: ['carrots', 'rüebli', 'karotte'], brand: '', cal100: 41, prot100: 0.9, carb100: 10, fat100: 0.2, serving: '100g' },
  { name: 'Spinat', aliases: ['spinach', 'spinat frisch'], brand: '', cal100: 23, prot100: 2.9, carb100: 3.6, fat100: 0.4, serving: '100g' },
  { name: 'Tomaten', aliases: ['tomato', 'tomate', 'tomaten'], brand: '', cal100: 18, prot100: 0.9, carb100: 3.9, fat100: 0.2, serving: '100g' },
  { name: 'Gurken', aliases: ['cucumber', 'gurke'], brand: '', cal100: 16, prot100: 0.7, carb100: 3.6, fat100: 0.1, serving: '100g' },
  { name: 'Peperoni', aliases: ['bell pepper', 'paprika', 'pepperoni'], brand: '', cal100: 31, prot100: 1, carb100: 6, fat100: 0.3, serving: '100g' },
  { name: 'Zwiebeln', aliases: ['onion', 'zwiebel'], brand: '', cal100: 40, prot100: 1.1, carb100: 9, fat100: 0.1, serving: '50g' },
  { name: 'Avocado', aliases: ['avocado frucht'], brand: '', cal100: 160, prot100: 2, carb100: 9, fat100: 15, serving: '100g' },
  { name: 'Banane', aliases: ['banana', 'bananen'], brand: '', cal100: 89, prot100: 1.1, carb100: 23, fat100: 0.3, serving: '120g' },
  { name: 'Apfel', aliases: ['apple', 'äpfel', 'apfel'], brand: '', cal100: 52, prot100: 0.3, carb100: 14, fat100: 0.2, serving: '150g' },
  { name: 'Orange', aliases: ['orange fruit', 'orangen'], brand: '', cal100: 47, prot100: 0.9, carb100: 12, fat100: 0.1, serving: '150g' },
  { name: 'Erdbeeren', aliases: ['strawberries', 'strawberry', 'erdbeere'], brand: '', cal100: 32, prot100: 0.7, carb100: 8, fat100: 0.3, serving: '100g' },
  { name: 'Heidelbeeren', aliases: ['blueberries', 'blueberry'], brand: '', cal100: 57, prot100: 0.7, carb100: 14, fat100: 0.3, serving: '100g' },
  { name: 'Himbeeren', aliases: ['raspberries', 'raspberry'], brand: '', cal100: 52, prot100: 1.2, carb100: 12, fat100: 0.7, serving: '100g' },
  { name: 'Trauben', aliases: ['grapes', 'traube'], brand: '', cal100: 69, prot100: 0.7, carb100: 18, fat100: 0.2, serving: '100g' },
  { name: 'Ananas', aliases: ['pineapple'], brand: '', cal100: 50, prot100: 0.5, carb100: 13, fat100: 0.1, serving: '100g' },

  // ─── Nuts / seeds / oils ───────────────────────────────────────
  { name: 'Mandeln', aliases: ['almonds', 'almond'], brand: '', cal100: 579, prot100: 21, carb100: 22, fat100: 50, serving: '30g' },
  { name: 'Walnüsse', aliases: ['walnuts', 'walnuss'], brand: '', cal100: 654, prot100: 15, carb100: 14, fat100: 65, serving: '30g' },
  { name: 'Cashewnüsse', aliases: ['cashews', 'cashew'], brand: '', cal100: 553, prot100: 18, carb100: 30, fat100: 44, serving: '30g' },
  { name: 'Erdnüsse', aliases: ['peanuts', 'peanut'], brand: '', cal100: 567, prot100: 26, carb100: 16, fat100: 49, serving: '30g' },
  { name: 'Erdnussbutter', aliases: ['peanut butter', 'erdnuss butter'], brand: 'Skippy', cal100: 588, prot100: 25, carb100: 20, fat100: 50, serving: '20g' },
  { name: 'Olivenöl', aliases: ['olive oil', 'olivenoel'], brand: '', cal100: 884, prot100: 0, carb100: 0, fat100: 100, serving: '10g' },
  { name: 'Rapsöl', aliases: ['rapeseed oil', 'canola oil'], brand: '', cal100: 884, prot100: 0, carb100: 0, fat100: 100, serving: '10g' },
  { name: 'Chia Samen', aliases: ['chia seeds', 'chia'], brand: '', cal100: 486, prot100: 17, carb100: 42, fat100: 31, serving: '15g' },
  { name: 'Leinsamen', aliases: ['flaxseed', 'flax seeds', 'linseed'], brand: '', cal100: 534, prot100: 18, carb100: 29, fat100: 42, serving: '15g' },

  // ─── Snacks & sweets ───────────────────────────────────────────
  { name: 'Schokolade Milch', aliases: ['milk chocolate', 'milchschokolade', 'milka'], brand: 'Lindt', cal100: 534, prot100: 7.7, carb100: 57, fat100: 30, serving: '25g' },
  { name: 'Schokolade Dunkel', aliases: ['dark chocolate', 'zartbitter'], brand: 'Lindt', cal100: 546, prot100: 7, carb100: 46, fat100: 35, serving: '25g' },
  { name: 'Toblerone', aliases: ['swiss chocolate', 'toblerone schweiz'], brand: 'Toblerone', cal100: 534, prot100: 5.5, carb100: 60, fat100: 29, serving: '30g' },
  { name: 'Ovomaltine', aliases: ['ovaltine', 'ovomaltine drink'], brand: 'Wander', cal100: 380, prot100: 7, carb100: 75, fat100: 4, serving: '25g' },
  { name: 'Gummibärchen', aliases: ['haribo', 'gummy bears', 'gummibaerchen'], brand: 'Haribo', cal100: 343, prot100: 6, carb100: 77, fat100: 0.5, serving: '30g' },
  { name: 'Chips', aliases: ['potato chips', 'crisps', 'zweifel'], brand: 'Zweifel', cal100: 530, prot100: 6, carb100: 53, fat100: 32, serving: '30g' },
  { name: 'Popcorn', aliases: ['popcorn gesalzen'], brand: '', cal100: 387, prot100: 12, carb100: 78, fat100: 4, serving: '30g' },

  // ─── Beverages ─────────────────────────────────────────────────
  { name: 'Rivella Rot', aliases: ['rivella', 'rivella red'], brand: 'Rivella', cal100: 40, prot100: 0.1, carb100: 10, fat100: 0, serving: '330ml' },
  { name: 'Rivella Blau', aliases: ['rivella blue', 'rivella light'], brand: 'Rivella', cal100: 3, prot100: 0.1, carb100: 0.5, fat100: 0, serving: '330ml' },
  { name: 'Coca-Cola', aliases: ['coke', 'cola', 'coca cola'], brand: 'Coca-Cola', cal100: 42, prot100: 0, carb100: 10.6, fat100: 0, serving: '330ml' },
  { name: 'Coca-Cola Zero', aliases: ['coke zero', 'coca cola zero'], brand: 'Coca-Cola', cal100: 0.2, prot100: 0, carb100: 0, fat100: 0, serving: '330ml' },
  { name: 'Orangensaft', aliases: ['orange juice', 'oj', 'orangen saft'], brand: 'Granini', cal100: 45, prot100: 0.7, carb100: 10, fat100: 0.2, serving: '250ml' },
  { name: 'Apfelsaft', aliases: ['apple juice', 'apfel saft'], brand: 'Ramseier', cal100: 46, prot100: 0.1, carb100: 11, fat100: 0.1, serving: '250ml' },
  { name: 'Bier', aliases: ['beer', 'lager', 'feldschloesschen'], brand: 'Feldschlösschen', cal100: 43, prot100: 0.5, carb100: 3.6, fat100: 0, serving: '330ml' },
  { name: 'Rotwein', aliases: ['red wine', 'wein rot'], brand: '', cal100: 85, prot100: 0.1, carb100: 2.6, fat100: 0, serving: '150ml' },
  { name: 'Weisswein', aliases: ['white wine', 'wein weiss'], brand: '', cal100: 82, prot100: 0.1, carb100: 2.6, fat100: 0, serving: '150ml' },
  { name: 'Kaffee (schwarz)', aliases: ['black coffee', 'espresso'], brand: '', cal100: 2, prot100: 0.1, carb100: 0, fat100: 0, serving: '50ml' },
  { name: 'Grüner Tee', aliases: ['green tea', 'gruener tee'], brand: '', cal100: 1, prot100: 0, carb100: 0, fat100: 0, serving: '200ml' },

  // ─── Supplements / fitness ─────────────────────────────────────
  { name: 'ESN Whey Protein', aliases: ['whey protein', 'protein powder', 'esn whey', 'molkenprotein'], brand: 'ESN', cal100: 376, prot100: 75, carb100: 7, fat100: 6, serving: '30g' },
  { name: 'Creatine Monohydrate', aliases: ['kreatin', 'creatin', 'creatine'], brand: 'ESN', cal100: 0, prot100: 0, carb100: 0, fat100: 0, serving: '5g' },
  { name: 'Protein Bar', aliases: ['proteinbar', 'eiweissriegel'], brand: 'Barebells', cal100: 380, prot100: 40, carb100: 20, fat100: 14, serving: '55g' },
  { name: 'Protein Joghurt', aliases: ['protein yogurt', 'eiweissjoghurt'], brand: 'Emmi', cal100: 65, prot100: 10, carb100: 4, fat100: 0.2, serving: '200g' },
  { name: 'Protein Pudding', aliases: ['high protein pudding'], brand: 'Ehrmann', cal100: 75, prot100: 10, carb100: 6, fat100: 1.5, serving: '200g' },

  // ─── Fast food common items ───────────────────────────────────
  { name: 'Big Mac', aliases: ['mcdonalds big mac', 'bigmac'], brand: 'McDonalds', cal100: 257, prot100: 12, carb100: 20, fat100: 14, serving: '215g' },
  { name: 'Cheeseburger', aliases: ['mcdonalds cheeseburger'], brand: 'McDonalds', cal100: 258, prot100: 14, carb100: 26, fat100: 11, serving: '120g' },
  { name: 'Pommes Frites', aliases: ['french fries', 'fries', 'chips'], brand: '', cal100: 312, prot100: 3.4, carb100: 41, fat100: 15, serving: '150g' },
  { name: 'Pizza Margherita', aliases: ['margherita pizza', 'cheese pizza'], brand: '', cal100: 266, prot100: 11, carb100: 33, fat100: 10, serving: '300g' },
  { name: 'Pizza Prosciutto', aliases: ['ham pizza', 'pizza mit schinken'], brand: '', cal100: 270, prot100: 13, carb100: 32, fat100: 11, serving: '300g' },
  { name: 'Kebab', aliases: ['doener', 'döner', 'doner kebab'], brand: '', cal100: 215, prot100: 14, carb100: 18, fat100: 10, serving: '300g' },
  { name: 'Caesar Salad', aliases: ['cesar salad', 'caesar'], brand: '', cal100: 145, prot100: 8, carb100: 5, fat100: 11, serving: '250g' },
  { name: 'Sushi Rolls', aliases: ['maki', 'sushi roll'], brand: '', cal100: 150, prot100: 5.5, carb100: 27, fat100: 2, serving: '200g' },
];

/* Helper: build the array of searchable strings for one food */
export function foodKeys(food) {
  const keys = [food.name];
  if (food.brand) keys.push(food.brand, `${food.name} ${food.brand}`, `${food.brand} ${food.name}`);
  if (food.aliases && food.aliases.length) keys.push(...food.aliases);
  return keys;
}
