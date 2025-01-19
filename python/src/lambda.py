

def handler (event, context):
  print ("In Lambda")
  return {
    "statusCode": 200,
    "body": "Hello from Lambda"
  }