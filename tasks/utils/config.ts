import fs from "fs";

export const getSetupConfig = (network: string, key: string) => {
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));
  return config[network][key];
}

export const updateSetupConfig = (network: string, key: string, value: any) => {
  const filename = "setup.config.json";
  const config = JSON.parse(fs.readFileSync(filename, "utf8"));

  if (!config[network]) {
    config[network] = {};
  }

  config[network][key] = value;

  fs.writeFileSync(filename, JSON.stringify(config, null, 2));
}