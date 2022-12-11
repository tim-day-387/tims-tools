//
// usage: echoargs [args]
//
//     This command reports back all of the arguments
//     passed to it. This includes the command name itself.
//

#include <stdio.h>

int main(int argc, char *argv[])
{
  int counter;

  for(counter = 0; counter < argc; counter++)
    {
      printf("argv[%d]: %s\n", counter, argv[counter]);
    }

  return 0;
}
