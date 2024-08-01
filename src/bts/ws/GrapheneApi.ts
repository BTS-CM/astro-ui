class GrapheneApi {
  ws_rpc: any;
  api_name: string;
  api_id: string;

  constructor(ws_rpc: any, api_name: string) {
    this.ws_rpc = ws_rpc;
    this.api_name = api_name;
    this.api_id = "";
  }

  async init(): Promise<GrapheneApi> {
    const self = this;
    let response;
    try {
      response = await this.ws_rpc.call([1, this.api_name, []]);
    } catch (error) {
      console.log({ error });
    }
    self.api_id = response;
    return self;
  }

  exec(method: string, params: any[]): Promise<any> {
    return this.ws_rpc.call([this.api_id, method, params]).catch((error: any) => {
      throw error;
    });
  }
}

export default GrapheneApi;
