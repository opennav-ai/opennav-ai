declare module "js-tiktoken/ranks/o200k_base" {
  const encoder: {
    readonly bpe_ranks: string;
    readonly pat_str: string;
    readonly special_tokens: Record<string, number>;
  };

  export default encoder;
}
