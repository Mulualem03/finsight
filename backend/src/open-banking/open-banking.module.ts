import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenBankingController } from './open-banking.controller';
import { OpenBankingService } from './open-banking.service';
import { MockProvider } from './providers/mock.provider';
import { TrueLayerProvider } from './providers/truelayer.provider';
import { TokenCipher } from './token-cipher';
import { OPEN_BANKING_PROVIDER } from './open-banking.types';
import { CategorizationModule } from '../categorization/categorization.module';

const providerFactory: Provider = {
  provide: OPEN_BANKING_PROVIDER,
  inject: [ConfigService, MockProvider, TrueLayerProvider],
  useFactory: (
    config: ConfigService,
    mock: MockProvider,
    trueLayer: TrueLayerProvider,
  ) => {
    const name = config.getOrThrow<string>('openBanking.provider');
    return name === 'truelayer' ? trueLayer : mock;
  },
};

@Module({
  imports: [CategorizationModule],
  controllers: [OpenBankingController],
  providers: [
    OpenBankingService,
    TokenCipher,
    MockProvider,
    TrueLayerProvider,
    providerFactory,
  ],
  exports: [OpenBankingService],
})
export class OpenBankingModule {}
