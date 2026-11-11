/*
 * English Gym · Instrucciones explícitas y ayudas guiadas por ejercicio (se aplican sobre BANK).
 */
/* ============================== CLEARER INSTRUCTIONS + GUIDED IMPROVE ============================== */
const EXPATCH={
g3:{q:"Complete with the correct verb form (two words).",ins:"Escribe el verbo know en el tiempo correcto. Es un condicional sobre el pasado."},
g4:{ins:"Hay 1 error de concordancia. Edita la oración."},
g6:{ins:"Hay 2 errores: el tiempo verbal y una preposición."},
g7:{ins:"Escribe una sola preposición."},
g9:{ins:"Hay 1 error de concordancia sujeto-verbo."},
g11:{q:"Complete with three words: auxiliary + subject + verb.",ins:"Después de Not only se invierte el orden: auxiliar + she + el verbo meet."},
g13:{ins:"Hay 1 error de preposición."},
g15:{ins:"Quita if y empieza con Had (inversión formal). El significado no cambia."},
g16:{ins:"Hay 1 error de tiempo verbal después de “It's the first time”."},
c6:{q:"Complete with one verb (collocation with 'attention').",ins:"¿Qué verbo va con attention? En español sería “poner atención”."},
c8:{q:"Complete with one verb (collocation with 'a favor').",ins:"Una palabra. Piensa si favor va con do o con make."},
c10:{ins:"Hay 1 error en una expresión fija (tomar en cuenta)."},
c13:{q:"Complete with one verb in the past tense (___ to a conclusion).",ins:"Un verbo en pasado que forme “llegar a una conclusión”."},
a1:{ins:"Une las dos ideas en una sola oración que empiece con Although."},
a4:{ins:"Convierte la pregunta directa en indirecta. Ojo con el orden sujeto-verbo."},
a5:{ins:"Une las dos oraciones con which (cláusula relativa)."},
a7:{ins:"El nuevo sujeto es Several studies. Mantén el present perfect."},
a8:{q:"Make the sentence more natural (remove the redundancy).",ins:"Se entiende, pero tiene una redundancia típica. Cambia solo la palabra marcada.",imp:true,hl:"because",why:"Redundante: reason ya significa “la causa”, así que because sobra.",ch:["The reason is that we didn't have time.","The reason is due to we didn't have time.","The reason is for we didn't have time."]},
a10:{ins:"Reemplaza If… not por unless. La cláusula con unless va en afirmativo."},
t3:{ins:"Calco del español. Escribe la edad como se dice en inglés."},
t5:{ins:"Hay 1 error: agree es un verbo, no un adjetivo."},
t7:{q:"Complete with one verb in the past tense (= 'me di cuenta').",ins:"Un verbo en pasado que signifique darse cuenta."},
t9:{q:"Translate the idea naturally into English (not word by word).",ins:"Usa present perfect negativo + for o in. No traduzcas “hace”."},
t10:{ins:"Hay 1 error de concordancia: people es plural."},
t12:{q:"Complete with one word: 'Depende de ti' (= you decide).",ins:"Una sola palabra que forme la expresión It's ___ to you."},
ac4:{q:"Rewrite the sentence in a formal academic register.",ins:"Cambia las palabras marcadas por equivalentes formales. El significado no cambia.",imp:true,hl:"got a lot of good",why:"Registro informal: got, a lot of y good suenan a conversación.",ch:["We obtained a number of positive results.","We got many good results.","We have gotten lots of nice results."]},
ac5:{q:"Rewrite the sentence for an academic essay (replace the informal word).",ins:"Solo una palabra es demasiado informal. Cámbiala por un adverbio formal.",imp:true,hl:"kinda",why:"Kinda es oral; en un ensayo se usa fairly, relatively o largely.",ch:["In conclusion, the results are fairly positive.","In conclusion, the results are kind of good.","In conclusion, the results are pretty good."]},
ac7:{q:"Complete the email with one word (fixed phrase: 'adjunto').",ins:"Fórmula fija de correo: Please find ___ …"},
ac9:{ins:"Convierte el verbo analyzed en sustantivo (analysis) y empieza con The."},
ac12:{q:"Make the sentence more academic (replace the verb phrase).",ins:"Cambia la parte marcada por un verbo académico de una sola palabra.",imp:true,hl:"talk about",why:"Talk about es oral; en un ensayo se usa discuss, examine o explore.",ch:["This essay will examine the effects of tourism.","This essay will speak about the effects of tourism.","This essay will chat about the effects of tourism."]},
r8:{q:"Rewrite this order as a polite question.",ins:"Convierte la orden en una pregunta cortés (Could you…? / Would you mind…?).",imp:true,hl:"Send me the slides now",why:"Imperativo + now suena a orden. Con un compañero o profesor es brusco.",ch:["Could you send me the slides when you have a moment?","Send me the slides now, please.","You must send me the slides."]},
r9:{ins:"Hay 1 error de estructura con explain."},
v3:{q:"Complete with a verb meaning 'cancelar' or 'posponer' (phrasal verbs allowed).",ins:"Puede ser un phrasal verb de 2 palabras o un verbo de 1 palabra, en infinitivo."},
v6:{q:"Complete the phrasal verb: ___ up on (= repasar).",ins:"Una palabra que forme el phrasal verb ___ up on (refrescar algo que ya sabías)."},
v9:{q:"Complete with one adjective meaning 'easy to understand'.",ins:"Un adjetivo que signifique claro o fácil de seguir."},
w1:{q:"Rewrite the sentence so it sounds natural (fix the Spanish-style phrase).",ins:"La parte marcada es un calco del español. Cámbiala por una expresión natural; lo demás puede quedarse.",imp:true,hl:"diversifying myself in",why:"“Diversify myself” no se usa: se diversifica una inversión, no una persona.",ch:["I've been getting involved in a variety of projects.","I have been diversifying me in different projects.","I have been diversified in different projects."]},
w2:{q:"Rewrite the sentence with the natural verb for 'party'.",ins:"Solo cambia el verbo marcado: en inglés no se “hace” una fiesta.",imp:true,hl:"make",why:"Calco de “hacer una fiesta”.",ch:["I'm going to throw a party for my birthday.","I'm going to do a party for my birthday.","I'm going to create a party for my birthday."]},
w3:{ins:"Calco de “quiero que…”. Reescribe con want + persona + to."},
w4:{q:"Make it concise: cut the redundant words (same meaning).",ins:"Hay tres formas de decir “yo opino” y una frase larga que equivale a consider. Quita lo que sobra.",imp:true,hl:"In my personal opinion, I think that",why:"Redundancia: tres expresiones de opinión y “take into consideration the fact that”.",ch:["It's important to consider that people learn differently.","In my opinion, I think it is important that people learn differently.","I personally think that it's important to take into consideration that people learn differently."]},
w6:{q:"Complete with one verb in the past tense (pasarla bien = ___ a great time).",ins:"Un verbo en pasado."}
};
BANK.forEach(e=>{if(EXPATCH[e.id])Object.assign(e,EXPATCH[e.id])});
function hlSentence(ex){
  const s=ex.s||"";if(!ex.hl)return esc(s);const i=s.indexOf(ex.hl);if(i<0)return esc(s);
  return esc(s.slice(0,i))+"<mark>"+esc(ex.hl)+"</mark>"+esc(s.slice(i+ex.hl.length));
}
