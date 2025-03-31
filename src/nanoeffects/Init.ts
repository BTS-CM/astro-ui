import {
  $userStorage,
  addUser,
  setCurrentUser,
  $currentUser,
} from "@/stores/users.ts";

async function useInitCache(chain: string) {
  if (!$currentUser || !$currentUser.get().username) {
    //console.log("No current user");
    const storedUsers = $userStorage.get().users;
    const lastAccount = $userStorage.get().lastAccount;
    const relevantUser = storedUsers.find((user) => user.chain === chain);
    if (!storedUsers || !storedUsers.length || !relevantUser) {
      //console.log("Storing default null account");
      addUser("null-account", "1.2.3", "1.2.3", "bitshares");
      setCurrentUser("null-account", "1.2.3", "1.2.3", "bitshares");
    } else if (lastAccount && lastAccount.length) {
      //console.log("Setting last account");
      const user = lastAccount[0];
      setCurrentUser(user.username, user.id, user.referrer, user.chain);
    } else if (relevantUser) {
      //console.log("Setting first account");
      setCurrentUser(
        relevantUser.username,
        relevantUser.id,
        relevantUser.referrer,
        relevantUser.chain
      );
    }
  }
}

export { useInitCache };
