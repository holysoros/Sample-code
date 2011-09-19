all: ringbuf

ringbufd: ringbuf.c ringbuf.h ctest.c ctest.h
	gcc -DTEST_RINGBUF -DTEST -g -o ringbufd ringbuf.c ctest.c

ringbuf: ringbuf.o ctest.o
	gcc -o ringbuf ringbuf.o ctest.o

ringbuf.o: ringbuf.h ringbuf.c
	gcc -DTEST_RINGBUF -DTEST -c ringbuf.c

ctest.o: ctest.h ctest.c
	gcc -c ctest.c

clean:
	rm *o ringbuf
