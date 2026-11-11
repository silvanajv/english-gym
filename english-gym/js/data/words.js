/*
 * English Gym · Word Bank: categorías y palabras difíciles para hispanohablantes.
 * Para agregar palabras lee CONTRIBUTING.md.
 */
/* ============================== WORD BANK DATA ============================== */
const WCATS={
  ff:{n:"Falsos amigos avanzados",d:"Se parecen al español, pero significan otra cosa."},
  germ:{n:"Origen germánico",d:"Sin raíz común con el español: no se deducen por parecido."},
  conn:{n:"Conectores C1",d:"Alternativas a but, although y however."},
  abs:{n:"Sustantivos abstractos",d:"Conceptos sin equivalente simple en español."},
  own:{n:"Mis palabras",d:"Las que tú agregas."},
  auto:{n:"Descubiertas",d:"Palabras de nivel C1 elegidas de un corpus de frecuencia, con definición en inglés del diccionario abierto Free Dictionary API (datos de Wiktionary)."}
};
const WORDS=[
{id:"compelling",w:"compelling",cat:"ff",pos:"adj",es:"convincente, fascinante, cautivador",short:"convincente",fals:"que obliga",trap:"No significa “compeler” u obligar.",ex:"She made a compelling argument for changing the policy.",form:"compelling",basic:["convincing argument","very interesting argument","good argument"]},
{id:"sensible",w:"sensible",cat:"ff",pos:"adj",es:"sensato, juicioso",short:"sensato",fals:"sensible (emocionalmente)",trap:"“Sensible” en español es sensitive.",ex:"Saving part of your scholarship is a sensible decision.",form:"sensible",basic:["reasonable decision","logical decision","smart decision"]},
{id:"sympathetic",w:"sympathetic",cat:"ff",pos:"adj",es:"compasivo, comprensivo, empático",short:"comprensivo",fals:"simpático",trap:"“Simpático” es nice o friendly.",ex:"My professor was sympathetic when I explained my situation.",form:"sympathetic",basic:["very understanding"]},
{id:"assume",w:"to assume",cat:"ff",pos:"verb",es:"suponer, dar por sentado",short:"suponer",fals:"hacerse cargo de algo",trap:"“Asumir una responsabilidad” es to take on.",ex:"I assumed the class was cancelled because nobody was there.",form:"assumed",basic:[]},
{id:"casualty",w:"casualty",cat:"ff",pos:"noun",es:"víctima, baja (en un accidente o guerra)",short:"víctima",fals:"casualidad",trap:"“Casualidad” es coincidence.",ex:"The typhoon caused no casualties, but many roads were closed.",form:"casualties",basic:[]},
{id:"pretend",w:"to pretend",cat:"ff",pos:"verb",es:"fingir, aparentar",short:"fingir",fals:"tener la intención",trap:"“Pretender” (tener la intención) es to intend.",ex:"He pretended to understand, but he was completely lost.",form:"pretended",basic:[]},
{id:"eventually",w:"eventually",cat:"ff",pos:"adv",es:"finalmente, con el tiempo",short:"al final",fals:"a veces, posiblemente",trap:"“Eventualmente” es possibly u occasionally.",ex:"After months of practice, she eventually felt confident speaking English.",form:"eventually",basic:["in the end"]},
{id:"compromise",w:"compromise",cat:"ff",pos:"noun",es:"acuerdo con concesiones mutuas",short:"acuerdo mutuo",fals:"obligación",trap:"“Compromiso” (obligación) es commitment.",ex:"After a long discussion, the team reached a compromise.",form:"compromise",basic:[]},
{id:"deception",w:"deception",cat:"ff",pos:"noun",es:"engaño",short:"engaño",fals:"decepción",trap:"“Decepción” es disappointment.",ex:"The company was accused of deception in its advertising.",form:"deception",basic:[]},
{id:"resume",w:"to resume",cat:"ff",pos:"verb",es:"reanudar, retomar",short:"reanudar",fals:"resumir",trap:"“Resumir” es to summarize.",ex:"Classes will resume on Monday after the holiday.",form:"resume",basic:["start again"]},
{id:"ignore",w:"to ignore",cat:"ff",pos:"verb",es:"no hacer caso, pasar por alto",short:"no hacer caso",fals:"no saber",trap:"“Ignorar” (no saber) es to be unaware of.",ex:"He ignored the warning and missed the deadline.",form:"ignored",basic:[]},
{id:"lecture",w:"lecture",cat:"ff",pos:"noun",es:"clase magistral, conferencia",short:"conferencia",fals:"lectura",trap:"“Lectura” es reading.",ex:"The lecture on machine learning was recorded for exchange students.",form:"lecture",basic:[]},
{id:"support",w:"to support",cat:"ff",pos:"verb",es:"apoyar, respaldar",short:"apoyar",fals:"aguantar",trap:"“Soportar” (aguantar) es to put up with.",ex:"The data supports our initial hypothesis.",form:"supports",basic:[]},
{id:"disgust",w:"disgust",cat:"ff",pos:"noun",es:"asco, repugnancia",short:"asco",fals:"disgusto, enojo",trap:"“Disgusto” es upset o annoyance.",ex:"She looked at the expired milk in disgust.",form:"disgust",basic:[]},

{id:"shrewd",w:"shrewd",cat:"germ",pos:"adj",es:"astuto, sagaz, perspicaz",short:"astuto",ex:"She is a shrewd negotiator who always gets a good deal.",form:"shrewd",basic:["smart negotiator","clever businessman","very smart"]},
{id:"grim",w:"grim",cat:"germ",pos:"adj",es:"sombrío, desalentador, lúgubre",short:"sombrío",ex:"The future looks grim for small bookstores.",form:"grim",basic:["looks very bad","dark future"]},
{id:"thrive",w:"to thrive",cat:"germ",pos:"verb",es:"prosperar, florecer, desarrollarse con éxito",short:"prosperar",ex:"Some plants thrive in humid climates.",form:"thrive",basic:["do very well","be very successful","grow a lot"]},
{id:"blunt",w:"blunt",cat:"germ",pos:"adj",es:"directo, brusco, sin rodeos; también desafilado",short:"directo, sin rodeos",ex:"To be blunt, the proposal is too expensive.",form:"blunt",basic:["very direct","too direct"]},
{id:"weary",w:"weary",cat:"germ",pos:"adj",es:"extremadamente cansado, agotado (física o mentalmente)",short:"agotado",ex:"After the long flight, we were weary but excited.",form:"weary",basic:["very tired","so tired","really tired"]},
{id:"bleak",w:"bleak",cat:"germ",pos:"adj",es:"desolador, inhóspito, poco prometedor",short:"desolador",ex:"The economic outlook remains bleak.",form:"bleak",basic:["not very promising"]},
{id:"jeopardize",w:"to jeopardize",cat:"germ",pos:"verb",es:"poner en peligro, arriesgar",short:"poner en peligro",ex:"Missing the exam could jeopardize your scholarship.",form:"jeopardize",basic:["put in danger","put at risk"]},
{id:"dwindle",w:"to dwindle",cat:"germ",pos:"verb",es:"disminuir poco a poco, menguar",short:"menguar",ex:"Our savings dwindled during the semester abroad.",form:"dwindled",basic:["decreased little by little","went down slowly"]},
{id:"loom",w:"to loom",cat:"germ",pos:"verb",es:"cernirse, avecinarse (algo amenazante)",short:"avecinarse",ex:"With finals looming, the library is full every night.",form:"looming",basic:[]},
{id:"dread",w:"to dread",cat:"germ",pos:"verb",es:"temer, sentir pavor ante algo",short:"temer",ex:"I dread giving presentations in front of large audiences.",form:"dread",basic:["am very afraid of","really fear"]},
{id:"thorough",w:"thorough",cat:"germ",pos:"adj",es:"minucioso, exhaustivo",short:"minucioso",ex:"The report includes a thorough analysis of the data.",form:"thorough",basic:["very detailed","very complete"]},
{id:"hinder",w:"to hinder",cat:"germ",pos:"verb",es:"obstaculizar, dificultar",short:"obstaculizar",ex:"Poor internet access can hinder online learning.",form:"hinder",basic:["make it difficult","make it harder"]},
{id:"sloppy",w:"sloppy",cat:"germ",pos:"adj",es:"descuidado, chapucero",short:"descuidado",ex:"The sloppy formatting made the report hard to read.",form:"sloppy",basic:["careless","messy"]},
{id:"cumbersome",w:"cumbersome",cat:"germ",pos:"adj",es:"engorroso, pesado de manejar",short:"engorroso",ex:"The registration process is cumbersome and slow.",form:"cumbersome",basic:["very complicated"]},

{id:"albeit",w:"albeit",cat:"conn",pos:"conn",es:"aunque, si bien (seguido de frase corta)",short:"aunque / si bien",ex:"He accepted the job, albeit with some hesitation.",form:"albeit",basic:[]},
{id:"notwithstanding",w:"notwithstanding",cat:"conn",pos:"conn",es:"a pesar de, no obstante",short:"a pesar de",ex:"Notwithstanding the budget cuts, the project was completed on time.",form:"notwithstanding",basic:[]},
{id:"hence",w:"hence",cat:"conn",pos:"conn",es:"por lo tanto, por consiguiente (muy formal)",short:"por lo tanto",ex:"The sample was small; hence, the results should be interpreted with caution.",form:"hence",basic:["for this reason","because of this"]},
{id:"whereas",w:"whereas",cat:"conn",pos:"conn",es:"mientras que (contraste)",short:"mientras que",ex:"Some students prefer group work, whereas others learn better alone.",form:"whereas",basic:["but on the other hand"]},
{id:"thereby",w:"thereby",cat:"conn",pos:"conn",es:"de ese modo, con lo cual",short:"de ese modo",ex:"The app automates reminders, thereby reducing missed appointments.",form:"thereby",basic:["and in this way"]},
{id:"nonetheless",w:"nonetheless",cat:"conn",pos:"conn",es:"sin embargo, aun así",short:"aun así",ex:"The task was difficult; nonetheless, we finished it on time.",form:"nonetheless",basic:["but still","even so"]},
{id:"inlightof",w:"in light of",cat:"conn",pos:"conn",es:"a la luz de, en vista de",short:"en vista de",ex:"In light of the new evidence, the committee changed its decision.",form:"In light of",basic:["because of the new"]},
{id:"insofaras",w:"insofar as",cat:"conn",pos:"conn",es:"en la medida en que",short:"en la medida en que",ex:"The model is useful insofar as the data is accurate.",form:"insofar as",basic:[]},

{id:"fulfillment",w:"fulfillment",cat:"abs",pos:"noun",es:"realización o satisfacción personal",short:"realización personal",ex:"She found a deep sense of fulfillment in teaching.",form:"fulfillment",basic:["personal satisfaction"]},
{id:"backlash",w:"backlash",cat:"abs",pos:"noun",es:"reacción negativa fuerte, rechazo (del público o un grupo)",short:"rechazo fuerte",ex:"The new fees caused a backlash among students.",form:"backlash",basic:["negative reaction","bad reaction"]},
{id:"flaw",w:"flaw",cat:"abs",pos:"noun",es:"defecto, imperfección",short:"defecto",ex:"There is a major flaw in the system.",form:"flaw",basic:["problem in the system","error in the design"]},
{id:"hindsight",w:"hindsight",cat:"abs",pos:"noun",es:"retrospectiva: ver algo con claridad después de que pasó",short:"retrospectiva",ex:"In hindsight, we should have started the project earlier.",form:"hindsight",basic:["looking back now"]},
{id:"bias",w:"bias",cat:"abs",pos:"noun",es:"sesgo, prejuicio",short:"sesgo",ex:"The survey results may reflect a selection bias.",form:"bias",basic:[]},
{id:"drawback",w:"drawback",cat:"abs",pos:"noun",es:"desventaja, inconveniente",short:"desventaja",ex:"The main drawback of remote work is isolation.",form:"drawback",basic:["negative point","bad thing about"]},
{id:"tradeoff",w:"trade-off",cat:"abs",pos:"noun",es:"compensación entre dos cosas: ganas una, pierdes otra",short:"disyuntiva",ex:"There is a trade-off between speed and accuracy.",form:"trade-off",basic:[]},
{id:"insight",w:"insight",cat:"abs",pos:"noun",es:"comprensión profunda, revelación",short:"comprensión profunda",ex:"The interviews gave us valuable insight into user behavior.",form:"insight",basic:["good understanding"]},
{id:"leverage",w:"to leverage",cat:"abs",pos:"verb",es:"aprovechar al máximo (verbo); influencia o ventaja (sustantivo)",short:"aprovechar",ex:"We can leverage our network to find more participants.",form:"leverage",basic:["take advantage of"]}
];
