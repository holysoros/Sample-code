/*!
 * \file	main.c
 * \brief	Generic ring buffer library for deeply embedded system.
 * \author	LiJunjie, holysoros@gmail.com
 * \version	1.1.00
 * \date	11-09-15 15:23:55
 */

/* Functional Description: Generic ring buffer library for deeply 
   embedded system. See the unit tests for usage examples. */

#ifndef RINGBUF_H
#define RINGBUF_H

#include <stdint.h>
#include <stdbool.h>

struct ringbuf {
    uint8_t     *data;          /* block of memory or array of data */
    unsigned    element_size;   /* how many bytes for each chunk */
    unsigned    element_count;  /* number of chunks of data */
    unsigned    readp;          /* first chunk of data */
    unsigned    count;          /* number of chunks in use */
};

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

bool ringbuf_isempty(struct ringbuf const *b);
bool ringbuf_isfull(struct ringbuf const *b);
bool ringbuf_get(struct ringbuf *b, uint8_t *buf);
bool ringbuf_put(struct ringbuf * b, uint8_t *buf, size_t size);
struct ringbuf *ringbuf_alloc(unsigned element_size, unsigned element_count);
void ringbuf_init(
    struct ringbuf * b,    /* ring buffer structure */
    uint8_t *data, /* data block or array of data */
    unsigned element_size,      /* size of one element in the data block */
    unsigned element_count);
void ringbuf_free(struct ringbuf *b);

#ifdef __cplusplus
}
#endif /* __cplusplus */
#endif
