

export class Constants {

  public static readonly DEFAULT_QUEUE_VISITIBLITY_TIMEOUT_SECONDS = 900;
  public static readonly DEFAULT_QUEUE_RETENTION_PERIOD_DAYS = 14;
  public static readonly DEFAULT_QUEUE_SUBSCRIPTION_BATCH_SIZE = 1;
  public static readonly DEFAULT_DLQ_MAX_RECEIVE_COUNT = 3;
  
  public static readonly DEFAULT_LAMBDA_CODE_KEY = `<<jar-path>>/<<jar-file>>.jar`;
  public static readonly DEFAULT_LAMBDA_MEMORY_MB = 2048;
  public static readonly DEFAULT_LAMBDA_TIMEOUT_SECONDS = 900;

  public static readonly DEAD_LETTER: String = "dead-letter";
  public static readonly LAMBDA_MODULE: String = "lambda-module";  
  public static readonly BATCH_COMPONENTS: String = "batch-components";  
  public static readonly BATCH_MODULE: String = "batch-module";  
  public static readonly MESSAGING_MODULE: String = "messaging-module";  
}