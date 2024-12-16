import { IDBPDatabase, openDB } from 'idb';
import Locker from '@/interfaces/Locker';
import Account from '@/interfaces/Account';
import Website from '@/interfaces/Website';
import SymmetricPGPEncryption from './pgp';

class IDBDatabases {
    
    public static dbName: string = "perakit-digital-keys";
    public static dbVersion: number = 1;
    private dbPromise: Promise<IDBPDatabase<any>>;
    private pass: string = "";

    constructor() {
        this.dbPromise = openDB(IDBDatabases.dbName);
    }

    async setPass() {
        const passpharase = await chrome.storage.session.get(["passphrase"]);
        this.pass = passpharase['passphrase'];
    }
    
    async encript(data: string) {
        const symmetricEncript = new SymmetricPGPEncryption(this.pass);
        const encrypt = await symmetricEncript.encryptMessage(data);
        return encrypt.message;
    }
    
    async dencript(data: string) {
        const symmetricEncript = new SymmetricPGPEncryption(this.pass);
        const encrypt = await symmetricEncript.decryptMessage(data);
        return encrypt.message;
    }
    
    static createDB() {
        const dbPromise = openDB(IDBDatabases.dbName, IDBDatabases.dbVersion, {
            upgrade(db) {
                const lockersStore = db.createObjectStore('lockers', {
                    // The 'id' property of the object will be the key.
                    keyPath: 'id',
                    // If it isn't explicitly set, create a value by auto incrementing.
                    autoIncrement: true,
                });
                lockersStore.createIndex('id', 'id');
                lockersStore.createIndex('locker', 'locker');

                const accountStore = db.createObjectStore('accounts', {
                    // The 'id' property of the object will be the key.
                    keyPath: 'id',
                    // If it isn't explicitly set, create a value by auto incrementing.
                    autoIncrement: true,
                });
                accountStore.createIndex('locker_id', 'locker_id');
                accountStore.createIndex('account', ['locker_id', 'id']);
                accountStore.createIndex('filter', ['locker_id', 'account']);

                const accountBinStore = db.createObjectStore('accountBins', {
                    // The 'id' property of the object will be the key.
                    keyPath: 'id',
                    // If it isn't explicitly set, create a value by auto incrementing.
                    autoIncrement: true,
                });
                accountBinStore.createIndex('locker_id', 'locker_id');
                accountBinStore.createIndex('account', 'id');
                accountBinStore.createIndex('filter', 'account');

                const siteStore = db.createObjectStore('sites', {
                    // The 'id' property of the object will be the key.
                    keyPath: 'id',
                    // If it isn't explicitly set, create a value by auto incrementing.
                    autoIncrement: true,
                });
                siteStore.createIndex('account_id', 'account_id');
                
                IDBDatabases.addSampleData(dbPromise);
            }
        });
    }

    // Locker
    public getLockers(): Promise<Locker[]> {
        return this.dbPromise.then(async (db) => {
            const lockers: Locker[] = [];
            let cursor = await db.transaction('lockers').store.openCursor();
            while (cursor) {
                lockers.push(cursor.value)
                cursor = await cursor.continue();
            }
            return lockers;
        });
    }
    public addLocker(locker: Locker) {
        return this.dbPromise
            .then(async (db) => await db.put('lockers', locker))
    }
    public removeLocker(locker: Locker) {
        return this.dbPromise.then(async (db) => {
            let backupAccount: Account[] = [];
            const index = db.transaction('accounts', 'readwrite').store.index('locker_id');
            for await (const cursor of index.iterate(locker.id)) {
                backupAccount.push(cursor.value);
                cursor.delete();
            }
    
            for (const account of backupAccount) {
                await this.addBins(locker.id, account);
            }
    
            const indexLocker = db.transaction('lockers', 'readwrite').store.index('id');
            for await (const cursor of indexLocker.iterate(locker.id)) {
                cursor.delete();
            }

            return this.getLockers();
        })
    }
    // End Locker

    // Account
    public encriptAllAccounts() {
        return new Promise<Account[]>((resolve, reject) => {
            const accounts: Account[] = [];
            this.dbPromise.then(async (db) => {
                const cursorRequest = await db.transaction('accounts', 'readwrite').store.openCursor();
                if(cursorRequest) for await (const cursor of cursorRequest) {
                    accounts.push(cursor.value);
                }
                for await(const account of accounts) {
                    db.put('accounts', {
                        ...account,
                        secret: await this.encript(account.secret),
                        password: await this.encript(account.password),
                        notes: await this.encript(account.notes),
                    });
                }
                resolve(accounts);
            }).catch(e => reject(e));
        });
    }
    public getAccounts(lockerId: string|number, account: string|undefined = undefined) {
        return new Promise<Account[]>((resolve, reject) => {
            const accounts: Account[] = [];
            this.dbPromise.then(async (db) => {
                if(account) {
                    const index = await db.transaction('accounts').store.index('filter');
                    const lowerBound = account; // e.g., "abc"
                    const upperBound = account + '\uffff'; // e.g., "abc" + highest character
                    const cursorRequest = await index.openCursor(
                        IDBKeyRange.bound(
                            [lockerId, lowerBound], 
                            [lockerId, upperBound]
                        )
                    )
                    if(cursorRequest) for await (const cursor of cursorRequest) {
                        accounts.push(cursor.value);
                    }
                
                } else {
                    const index = db.transaction('accounts', 'readwrite').store.index('locker_id');
                    for await (const cursor of index.iterate(lockerId)) {
                        accounts.push(cursor.value);
                    }
                }
                for await(const account of accounts) {
                    account.secret = await this.dencript(account.secret);
                    account.password = await this.dencript(account.password);
                    account.notes = await this.dencript(account.notes);
                }
                resolve(accounts);
            }).catch(e => reject(e));
        });
    }
    public addAccount(account: Account): Promise<Account> {
        return this.dbPromise.then(async (db) => {
            return db.add('accounts', {
                account: account.account,
                locker_id: account.locker_id,
                username: account.username,
                email: account.email,
                time: account.time,
                avatar: account.avatar,
                password: await this.encript(account.password),
                secret: await this.encript(account.secret),
                notes: await this.encript(account.notes),
            })
            .then(() => db.transaction('accounts').store.openCursor(null, 'prev'))
            .then(cursor => cursor?.value )
            .then(async account => {
                return {
                    ...account,
                    secret: await this.dencript(account.secret),
                    password: await this.dencript(account.password),
                    notes: await this.dencript(account.notes)
                } 
            });
        })
    }
    public updateAccount(account: Account, websites: Website[]|undefined = undefined) {
        return this.dbPromise.then(async (db) => {
            return db.put('accounts', {
                ...account,
                secret: await this.encript(account.secret),
                password: await this.encript(account.password),
                notes: await this.encript(account.notes)
            })
            .then(() => this.removeWebsites(account.id))
            .then(() => {
                if(websites && websites.length > 0) 
                    return this.addWebsites(account.id, websites)
            })
        })
    }
    public removeAccount(lockerId: number, accountId: number) {
        return this.dbPromise.then(async (db) => {
            let account: Account | undefined = undefined;
            const index = db.transaction('accounts', 'readwrite').store.index('account');
            const range = IDBKeyRange.only([lockerId, accountId]);
            let cursor = await index.openCursor(range);

            while (cursor) {
                account = cursor.value;
                cursor.delete();
                cursor = await cursor.continue();
            }

            if (account) {
                await this.addBins(lockerId, account);
            }

            return this.getAccounts(lockerId);
        });
    }
    // End Account

    // Website
    public getWebsites(accountId: number) {
        return new Promise<Website[]>((resolve, reject) => {
            this.dbPromise.then(async (db) => {
                const websites: Website[] = [];
                const index = db.transaction('sites').store.index('account_id');
                for await (const cursor of index.iterate(accountId)) {
                    websites.push(cursor.value)
                }
                resolve(websites);
            })
        })
    }
    public addWebsites(accountId: number, websites: Website[]){
        return this.dbPromise.then(async (db) => {
            for (const website of websites) {
                if (website.site_url) {
                    await db.add('sites', {
                        account_id: accountId,
                        site_url: website.site_url,
                    });
                }
            }
        })
    }
    public removeWebsites(accountId: number) {
        return this.dbPromise.then(async (db) => {
            const index = db.transaction('sites', 'readwrite').store.index('account_id');
            for await (const cursor of index.iterate(accountId)) {
                cursor.delete();
            }
            return true;
        })
    }
    // End Website

    // Recyclebin
    public getBins (account: string|undefined = undefined) {
        return new Promise<Account[]>((resolve, reject) => {
            this.dbPromise.then(async (db) => {
                const accounts: Account[] = [];
                if(account) {
                    const index = await db.transaction('accountBins').store.index('filter');
                    const lowerBound = account; // e.g., "abc"
                    const upperBound = account + '\uffff'; // e.g., "abc" + highest character
                    const cursorRequest = await index.openCursor(
                        IDBKeyRange.bound(lowerBound, upperBound)
                    )
                    if(cursorRequest) for await (const cursor of cursorRequest) {
                        accounts.push(cursor.value);
                    }
                
                } else {
                    let cursor = await db.transaction('accountBins').store.openCursor();
                    while (cursor) {
                        accounts.push(cursor.value)
                        cursor = await cursor.continue();
                    }
                }
                
                for await(const account of accounts) {
                    account.secret = await this.dencript(account.secret)
                    account.password = await this.dencript(account.password)
                    account.notes = await this.dencript(account.notes)
                }
                resolve(accounts);
            }).catch(e => reject(e));
        });
    }

    public addBins(lockerId: number, account: Account) {
        return this.dbPromise.then(async (db) => {
            await db.add('accountBins', {
                id: account.id,
                account: account.account,
                locker_id: lockerId,
                username: account.username,
                email: account.email,
                password: account.password,
                secret: account.secret,
                time: account.time,
                avatar: account.avatar,
                notes: account.notes,
            });
        })
    }

    public removeBins(accountId: number, removeSites = true) {
        return this.dbPromise.then(async (db) => {
            const index = db.transaction('accountBins', 'readwrite').store.index('account');
            for await (const cursor of index.iterate(accountId)) {
                cursor.delete();
            }
            if(removeSites) {
                return this.removeWebsites(accountId);
            }
        })
    }

    public restoreAccounts(lockerId: number) {
        return this.dbPromise.then(async (db) => {
            const accounts: Account[] = [];
            let cursor = await db.transaction('accountBins', 'readwrite').store.openCursor();
            while (cursor) {
                accounts.push(cursor.value);
                cursor.delete();
                cursor = await cursor.continue();
            }
            for (const account of accounts) {
                account.locker_id = lockerId;
                await db.put('accounts', {...account});
            }
            return true;
        })
    }

    public clearBins() {
        return this.dbPromise.then(async (db) => {
            const accounts: Account[] = [];
            let cursor = await db.transaction('accountBins', 'readwrite').store.openCursor();
            while (cursor) {
                accounts.push(cursor.value);
                cursor.delete();
                cursor = await cursor.continue();
            }
            for (const account of accounts) {
                await this.removeWebsites(account.id);
            }
            return true;
        })
    }
    // End Recyclebin

    
    static addSampleData(dbPromise: Promise<IDBPDatabase<unknown>>) {
        dbPromise.then(async (db) => {
            await db.add('lockers', {
                id: 1,
                name: "Pribadi",
                icon: "",
            });
        })
    }
}

export default IDBDatabases;