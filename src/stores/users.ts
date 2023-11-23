import { map } from "nanostores";
import { persistentMap } from "@nanostores/persistent";

type User = {
  username: string;
  id: string;
  chain: string;
  referrer: string;
};

/**
 * Declaring the current user map nanostore
 */
const $currentUser = map<User>({
  username: "",
  id: "",
  chain: "",
  referrer: "",
});

/**
 * Setting the current user in a non persistent nanostore map
 * @param username
 * @param id
 * @param referrer
 * @param chain
 */
function setCurrentUser(username: string, id: string, referrer: string, chain: string) {
  $currentUser.set({
    username,
    id,
    chain,
    referrer,
  });

  try {
    addUser(username, id, referrer, chain);
  } catch (e) {
    console.log(e);
  }
}

function eraseCurrentUser() {
  $currentUser.set({
    username: "",
    id: "",
    chain: "",
    referrer: "",
  });
}

type StoredUsers = {
  users: User[];
  lastAccount: User[];
};

/**
 * Declaring the persistent user store
 */
const $userStorage = persistentMap<StoredUsers>(
  "storedUsers:",
  {
    users: [],
    lastAccount: [],
  },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.log(e);
        return value;
      }
    },
  }
);

/**
 * Add an user to the persistent user store
 * @param username
 * @param id
 * @param chain
 */
function addUser(username: string, id: string, referrer: string, chain: string) {
  const users = $userStorage.get().users;
  const user = { username, id, referrer, chain };
  $userStorage.setKey("lastAccount", [user]);
  if (users.find((user) => user.id === id)) {
    //console.log("Using existing user");
    return;
  }
  const newUsers = [...users, user];
  $userStorage.setKey("users", newUsers);
}

/**
 * Removing a single user from the persistent user store
 * @param id
 */
function removeUser(id: string) {
  const users = $userStorage.get().users;
  const newUsers = users.filter((user) => user.id !== id);
  $userStorage.setKey("users", newUsers);

  const lastUser = $userStorage.get().lastAccount;
  if (lastUser && lastUser.length && lastUser[0].id === id) {
    $userStorage.setKey("lastAccount", []);
  }
}

export { $currentUser, setCurrentUser, eraseCurrentUser, $userStorage, addUser, removeUser };
