import { AppRegistry, LogBox } from "react-native";
import notifee, { EventType } from "@notifee/react-native";
import App from "./src/App";
import bootTask from "./src/lib/boot-task";
import { name as appName } from "./app.json";

// Aviso de dev-mode sem causa identificável no nosso código (não aparece em
// nenhuma lib do projeto) e sem efeito real — só polui a tela com o app
// aberto. Não existe em build de produção/release de qualquer forma.
LogBox.ignoreLogs(["useInsertionEffect must not schedule updates"]);

// Sem isso, o Notifee mostra a notificação de "Você está online" mas nunca
// avisa o Android que é pra manter o processo vivo como foreground service
// de verdade — daí o app podia ser encerrado a qualquer momento em segundo
// plano. A promise só resolve quando o serviço é parado (stopForegroundService
// em src/lib/location.ts).
notifee.registerForegroundService(
  () =>
    new Promise(() => {
      // fica pendurada de propósito — o serviço só termina via
      // notifee.stopForegroundService()
    })
);

notifee.onBackgroundEvent(async ({ type }) => {
  if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    // nada a fazer aqui por enquanto — só evita o warning do Notifee sobre
    // handler de evento em segundo plano não registrado.
  }
});

// Retoma o rastreamento sozinho se o celular reiniciar com o entregador
// online — ver BootReceiver.kt/LocationBootTaskService.kt.
AppRegistry.registerHeadlessTask("LocationBootTask", () => bootTask);

AppRegistry.registerComponent(appName, () => App);
