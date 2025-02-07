import { expect } from "chai";
import {Account, AleoNetworkClient, BlockHeightSearch, NetworkRecordProvider} from "../src/node";
import {beaconPrivateKeyString} from "./data/account-data";

describe.skip('RecordProvider', () => {
    let account: Account;
    let networkClient: AleoNetworkClient;
    let recordProvider: NetworkRecordProvider;

    beforeEach(() => {
        account = new Account({privateKey: beaconPrivateKeyString});
        networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");
        recordProvider = new NetworkRecordProvider(account, networkClient);
    });

    describe('Record provider', () => {
        it('should not find records where there are none', async () => {
            const params = new BlockHeightSearch(0, 100);
            const records = await recordProvider.findCreditsRecords([100, 200], true, [], params);
            expect(<object>records).equal([]);
        });
    });
});
