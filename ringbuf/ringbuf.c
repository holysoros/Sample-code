/*!
 * \file	main.c
 * \brief	
 * Generic ring buffer library for deeply embedded system.
 *
 * See the unit tests for usage examples;
 * Refer to http://en.wikipedia.org/wiki/Circular_buffer for detail.
 *
 * \author	LiJunjie, holysoros@gmail.com
 * \version	1.1.00
 * \date	11-07-15 15:23:55
 */

#include <stdlib.h>                             /* for malloc/free */
#include <string.h>                             /* for memcpy */
#include "ringbuf.h"

bool ringbuf_isempty(struct ringbuf const *b)
{
    return (b ? (b->count == 0) : true);
}

bool ringbuf_isfull(struct ringbuf const *b)
{
    return (b? (b->count == b->element_count): false);
}

/*!
 * \brief Gets the data from the front of the list, and removes it.
 *
 * \param b ringbuf which get data from.
 * \param buf [OUT].
 *
 * \return
 * true     正确返回，参数buf中包含得到的数据;
 * false    参数不正确，或ringbuf当前为空.
 */
bool ringbuf_get(struct ringbuf *b, uint8_t *buf)
{
    bool        status = false;
    uint8_t     *data = NULL;

    if (b && buf && b->count) {
        data = b->data + b->readp * b->element_size;
        memcpy(buf, data, b->element_size);
        b->readp++;
        if (b->readp == b->element_count)
            b->readp = 0;
        b->count--;
        status = true;
    }

    return status;
}

/*!
 * \brief Adds an element of data to the ring buffer.
 *
 * 有些执行在ringbuf满了后，就不再添加element；这样才有可能实现thread-safe的
 * 无锁ringbuf；但是这个执行在ringbuf满了，仍会添加element；即write pointer
 * 与read pointer都会向下一个元素推移；因此，在多线程调用get/put时都必须加锁.
 *
 * \param b [IN] ringbuf which add data to.
 * \param buf [IN] data to be added.
 * \param size [IN] size of data in buf to be added.
 *
 * \return 
 * true     添加成功;
 * false    添加失败，参数不正确.
 */
bool ringbuf_put(struct ringbuf * b, uint8_t *buf, size_t size)
{
    bool        status = false;
    unsigned    writep = 0;        /* write pointer */
    uint8_t     *ring_data = NULL;     /* used to help point ring data */

    if (b && buf) {
        writep = b->readp + b->count;
        if (writep >= b->element_count)         /* wrap around */
            writep -= b->element_count;
        ring_data = b->data + writep * b->element_size;
        memcpy(ring_data, buf, size);
        if (b->count == b->element_count) {     /* is full */
            b->readp++;
            if (b->readp == b->element_count)
                b->readp = 0;
        }
        else {
            b->count++;
        }
        status = true;
    }

    return status;
}

/*!
 * \brief Configures the ring buffer.
 *
 * \param b ring buffer structure.
 * \param data data block or array of data.
 * \param element_size size of one element in the data block.
 * \param element_count number of elements in the data block.
 */
void ringbuf_init(
    struct ringbuf * b,
    uint8_t *data,
    unsigned element_size,
    unsigned element_count)
{
    if (b) {
        b->readp = 0;
        b->count = 0;
        b->data = data;
        b->element_size = element_size;
        b->element_count = element_count;
    }

    return;
}

/*!
 * \brief Allocate the ring buffer.
 *
 * \param element_size size of one element in the data block.
 * \param element_count number of elements in the data block.
 *
 * \return 
 * 成功返回创建的ringbuf structure；
 * 失败返回NULL.
 */
struct ringbuf *ringbuf_alloc(unsigned element_size, unsigned element_count)
{
    struct ringbuf  *b;
    void            *data;

    if ((b = malloc(sizeof(*b))) == NULL)
        return NULL;
    if ((data = malloc(element_size * element_count)) == NULL)
        return NULL;
    b->readp = 0;
    b->count = 0;
    b->data = data;
    b->element_size = element_size;
    b->element_count = element_count;

    return b;
}

void ringbuf_free(struct ringbuf *b)
{
    free(b->data);
    free(b);
}

#ifdef TEST
#include <assert.h>
#include <string.h>

#include "ctest.h"

/* test the FIFO */
#define DATA_SIZE 2600
#define COUNT 10
void testRingBuf(Test * pTest)
{
    struct ringbuf rbuf;
    uint8_t data_store[DATA_SIZE * COUNT];
    uint8_t data[DATA_SIZE];
    uint8_t test_data[DATA_SIZE];
    unsigned index;
    unsigned data_index;
    unsigned count;
    unsigned dummy;
    bool status;

    ringbuf_init(&rbuf, data_store, DATA_SIZE, COUNT);
    /*
     *测试ringbuf为空
     */
    ct_test(pTest, ringbuf_isempty(&rbuf));

    /*
     *写入一个数据块
     */
    for (data_index = 0; data_index < DATA_SIZE; data_index++) {
        data[data_index] = data_index;
    }
    status = ringbuf_put(&rbuf, data, DATA_SIZE);
    ct_test(pTest, status == true);
    ct_test(pTest, !ringbuf_isempty(&rbuf));
    ct_test(pTest, rbuf.readp == 0);
    ct_test(pTest, rbuf.count == 1);

    /*
     *再获取一个数据块，buffer空了
     */
    ct_test(pTest, ringbuf_get(&rbuf, test_data));
    for (data_index = 0; data_index < DATA_SIZE; data_index++) {
        ct_test(pTest, test_data[data_index] == data[data_index]);
    }
    ct_test(pTest, ringbuf_isempty(&rbuf));
    ct_test(pTest, rbuf.readp == 1);
    ct_test(pTest, rbuf.count == 0);

    /*
     *填满整个buffer
     */
    for (index = 0; index < COUNT; index++) {
        status = ringbuf_put(&rbuf, data, DATA_SIZE);
        ct_test(pTest, status == true);
    }
    ct_test(pTest, ringbuf_isfull(&rbuf));
    ct_test(pTest, rbuf.readp == 1);
    ct_test(pTest, rbuf.count == COUNT);

    /*
     *然后读一个，不再满了
     */
    ct_test(pTest, ringbuf_get(&rbuf, test_data));
    ct_test(pTest, !ringbuf_isfull(&rbuf));
    ct_test(pTest, rbuf.readp == 2);

    /*
     *然后再写一个，又满了
     */
    ct_test(pTest, ringbuf_put(&rbuf, data, DATA_SIZE));
    ct_test(pTest, ringbuf_isfull(&rbuf));
    ct_test(pTest, rbuf.readp == 2);
    ct_test(pTest, rbuf.count == COUNT);

    /*
     *再写COUNT - 1个
     */
    for (data_index = rbuf.readp; data_index < COUNT; data_index++) {
        ct_test(pTest, ringbuf_put(&rbuf, data, DATA_SIZE));
    }
    ct_test(pTest, rbuf.readp == 0);
    ct_test(pTest, rbuf.count == COUNT);

    return;
}

#ifdef TEST_RINGBUF
int main(
    void)
{
    Test *pTest;
    bool rc;

    pTest = ct_create("ringbuf", NULL);

    /* individual tests */
    rc = ct_addTestFunction(pTest, testRingBuf);
    assert(rc);

    ct_setStream(pTest, stdout);
    ct_run(pTest);
    (void) ct_report(pTest);

    ct_destroy(pTest);

    return 0;
}
#endif
#endif
