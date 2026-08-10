import { CliModule } from './cli.module';

async function bootstrap(): Promise<void> {
  await CliModule.run();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});